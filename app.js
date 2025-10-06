/* ======= CONFIG ======= */
// Maximum number of recent searches to store
const maxRecent = 6;

/* ======= DOM REFS ======= */
// Cache all frequently used DOM elements for performance
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const geoBtn = document.getElementById('geoBtn');
const recentDropdown = document.getElementById('recentDropdown');
const unitToggle = document.getElementById('unitToggle');

const errorBox = document.getElementById('errorBox');
const tempAlert = document.getElementById('tempAlert');

const cityNameEl = document.getElementById('cityName');
const dateTextEl = document.getElementById('dateText');
const currentIcon = document.getElementById('currentIcon');
const todayTempEl = document.getElementById('todayTemp');
const tempUnitEl = document.getElementById('tempUnit');
const descriptionEl = document.getElementById('description');
const windEl = document.getElementById('wind');
const forecastEl = document.getElementById('forecast');

// Adding Background
// Updates the page background depending on weather condition + time of day
const updateBackground = (weatherCode, currentTime) => {
  const hour = new Date(currentTime).getHours();
  const isDay = hour >= 6 && hour < 18; // 6 AM - 6 PM considered day

  let bgClass = '';

  // Map weather codes to types
  if ([0,1,2].includes(weatherCode)) bgClass = 'clear';
  else if (weatherCode === 3) bgClass = 'cloudy';
  else if ([45,48].includes(weatherCode)) bgClass = 'fog';
  else if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(weatherCode)) bgClass = 'rain';
  else if ([71,73,75,77,85,86].includes(weatherCode)) bgClass = 'snow';
  else if ([95,96,99].includes(weatherCode)) bgClass = 'thunder';
  else bgClass = 'clear';

  // Optional: hail
  if ([56,57,66,67].includes(weatherCode)) bgClass = 'hail';

  const finalClass = `${isDay ? 'bg-day' : 'bg-night'}-${bgClass}`;

  // Remove previous bg classes
  document.body.classList.remove(
    'bg-day-clear','bg-day-cloudy','bg-day-rain','bg-day-snow','bg-day-thunder','bg-day-fog','bg-day-hail',
    'bg-night-clear','bg-night-cloudy','bg-night-rain','bg-night-snow','bg-night-thunder','bg-night-fog','bg-night-hail'
  );

  // Add new background class
  document.body.classList.add(finalClass);
};


/* ======= STATE ======= */
let currentUnit = 'C';
let lastCoords = null;
let lastCity = null;

/* ======= HELPERS ======= */
const showError = msg => {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  setTimeout(clearError, 5000);
};
const clearError = () => {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
};
const showTempAlert = msg => {
  tempAlert.textContent = msg;
  tempAlert.classList.remove('hidden');
};
const hideTempAlert = () => {
  tempAlert.textContent = '';
  tempAlert.classList.add('hidden');
};

/* ======= LOADER CONTROL ======= */
// Loader shown while fetching API data
const loaderOverlay = document.getElementById('loaderOverlay');

const showLoader = () => loaderOverlay.classList.remove('hidden');
const hideLoader = () => loaderOverlay.classList.add('hidden');

// Converts raw temp into °C or °F depending on toggle
const formatTemp = temp =>
  currentUnit === 'C' ? Math.round(temp) : Math.round((temp * 9) / 5 + 32);

// Finds index of nearest hour in hourly API data
function findNearestHourIndex(hourlyTimes, currentTime) {
  const cur = new Date(currentTime).getTime();
  let nearestIdx = 0;
  let minDiff = Infinity;
  hourlyTimes.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - cur);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIdx = i;
    }
  });
  return nearestIdx;
}

/* ======= LOCAL STORAGE ======= */
// Save searched city to localStorage (avoid duplicates)
const saveRecent = city => {
  if (!city) return;
  const key = 'recentCities_v1';
  let arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr = arr.filter(c => c.toLowerCase() !== city.toLowerCase());
  arr.unshift(city);
  if (arr.length > maxRecent) arr = arr.slice(0, maxRecent);
  localStorage.setItem(key, JSON.stringify(arr));
  renderRecent();
};

// Render dropdown of recent searches
const renderRecent = () => {
  const key = 'recentCities_v1';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(arr) || arr.length === 0) {
    recentDropdown.classList.add('hidden');
    return;
  }
  recentDropdown.innerHTML = '';

   // Placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Recent searches';
  recentDropdown.appendChild(placeholder);

   // Add each recent city
  arr.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    recentDropdown.appendChild(opt);
  });
  recentDropdown.classList.remove('hidden');
};

// Maps weather codes to human-readable descriptions
const mapWeatherCode = code => {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return codes[code] || 'Overcast';
};

const pickIcon = code => {
  if (code === 0) return 'images/icons/clear.png'; // Clear sky
  if (code === 1 || code === 2) return 'images/icons/partly-cloudy.png'; // Partly cloudy
  if (code === 3) return 'images/icons/cloudy.png'; // Overcast

  if (code === 45 || code === 48) return 'images/icons/fog.png'; // Fog

  if ([51, 53, 55, 56, 57].includes(code)) return 'images/icons/drizzle.png'; // Drizzle
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'images/icons/rain.png'; // Rain & showers

  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'images/icons/snow.png'; // Snow & snow showers

  if ([95, 96, 99].includes(code)) return 'images/icons/thunder.png'; // Thunderstorms

  return 'images/icons/cloudy.png'; // Default fallback
};

/* ======= API CALLS ======= */
// Get coordinates for city name
const fetchCoordsByCity = async city => {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1`
  );
  const data = await res.json();
  if (!data.results || data.results.length === 0)
    throw new Error('City not found');
  return data.results[0];
};

// Get multiple city suggestions for autocomplete
const fetchCoordsSuggestions = async query => {
  if (!query.trim()) return [];

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=5`
  );
  const data = await res.json();

  return data.results || [];
};

// Get weather data by coordinates
const fetchWeatherByCoords = async (lat, lon) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,pressure_msl,cloudcover,uv_index,precipitation&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,uv_index_max&timezone=auto`;
  const res = await fetch(url);
  return res.json();
};

/* ======= RENDERING ======= */
// Display current weather on UI
const renderCurrent = (data, location) => {
  const current = data.current_weather;
  if (!current) return;

  // Update city + date
  cityNameEl.textContent = `${location.name || "Unknown"}${location.country ? ', ' + location.country : ''}`;
  dateTextEl.textContent = new Date(current.time).toLocaleString();

  // Update main weather info
  const tempC = current.temperature;
  todayTempEl.textContent = formatTemp(tempC);
  tempUnitEl.textContent = currentUnit === 'C' ? '°C' : '°F';

  descriptionEl.textContent = mapWeatherCode(current.weathercode);
  windEl.textContent = current.windspeed + ' km/h';
  currentIcon.src = pickIcon(current.weathercode);
  currentIcon.alt = descriptionEl.textContent;

  // find nearest hour for extra values
  if (data.hourly && data.hourly.time) {
    const idx = findNearestHourIndex(data.hourly.time, current.time);
    document.getElementById('humidity').textContent = data.hourly.relativehumidity_2m[idx] + '%';
    document.getElementById('pressure').textContent = data.hourly.pressure_msl[idx] + ' hPa';
    document.getElementById('clouds').textContent = data.hourly.cloudcover[idx] + '%';
    document.getElementById('uv').textContent = data.hourly.uv_index[idx];
    document.getElementById('precip').textContent = data.hourly.precipitation[idx] + ' mm';
  }

  updateBackground(current.weathercode, current.time);

  tempC > 40
    ? showTempAlert(`Extreme temperature alert: ${Math.round(tempC)}°C — stay hydrated!`)
    : hideTempAlert();
};

// Display forecast cards
const renderForecast = data => {
  forecastEl.innerHTML = '';
  if (!data.daily || !data.daily.time) {
    forecastEl.innerHTML = '<div class="p-4 text-gray-600">No forecast available.</div>';
    return;
  }

  const days = data.daily.time;
  for (let i = 1; i <= 5 && i < days.length; i++) {
    const card = document.createElement('div');
    card.className = 'p-3 card text-center';
    card.innerHTML = `
      <div class="font-semibold">${new Date(days[i]).toLocaleDateString(undefined, { weekday: 'short' })}</div>
      <img src="${pickIcon(data.daily.weathercode[i])}" 
           alt="${mapWeatherCode(data.daily.weathercode[i])}" 
           class="mx-auto" />
      <div class="text-xl font-bold">
        ${formatTemp(data.daily.temperature_2m_max[i])}°${currentUnit} /
        ${formatTemp(data.daily.temperature_2m_min[i])}°${currentUnit}
      </div>
      <div class="text-sm text-gray-600">Precip: ${data.daily.precipitation_sum[i]} mm</div>
      <div class="text-sm text-gray-600">UV Max: ${data.daily.uv_index_max[i]}</div>
    `;
    forecastEl.appendChild(card);
  }
};


/* ======= ORCHESTRATION ======= */
// Search city by name → fetch → render
const searchCity = async city => {
  clearError();
  if (!city.trim()) return showError('Please enter a city name.');
  showLoader(); //  Show loader
  try {
    const loc = await fetchCoordsByCity(city);
    const data = await fetchWeatherByCoords(loc.latitude, loc.longitude);
    lastCoords = { lat: loc.latitude, lon: loc.longitude };
    lastCity = loc.name;
    localStorage.setItem('lastCity', loc.name);
    renderCurrent(data, loc);
    renderForecast(data);
    saveRecent(loc.name);
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoader(); // Always hide loader
  }
};

// Search weather by geolocation coordinates
const searchByCoords = async (lat, lon) => {
  showLoader();
  try {
    let loc = { name: 'Unknown', country: '' };
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const geoRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'weather-app/1.0' }
      });
      const geoData = await geoRes.json();
      if (geoData && geoData.address) {
        const addr = geoData.address;
        const name =
          addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.state || "Unknown";
        loc = { name, country: addr.country || '' };
      }
    } catch (geoErr) {
      console.warn("⚠ Reverse geocoding failed:", geoErr.message);
    }

    const data = await fetchWeatherByCoords(lat, lon);
    lastCoords = { lat, lon };
    lastCity = loc.name;
    renderCurrent(data, loc);
    renderForecast(data);
    saveRecent(loc.name);
    searchInput.value = "";
  } catch (err) {
    console.error('searchByCoords error:', err);
    showError('Unable to fetch location-based weather.');
  } finally {
    hideLoader();
  }
};

/* ======= EVENTS ======= */
// Search form submit
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  searchCity(searchInput.value);
});

// Geo button → use device location
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation)
    return showError('Geolocation not supported in this browser.');
  navigator.geolocation.getCurrentPosition(
    pos => searchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError('Unable to retrieve location. Please allow location access.')
  );
});

// Dropdown for recent searches
recentDropdown.addEventListener('change', e => {
  if (e.target.value) searchCity(e.target.value);
});

// Unit toggle (°C ↔ °F)
const unitThumb = document.getElementById('unitThumb');

unitToggle.addEventListener('click', () => {
  // Toggle state
  currentUnit = currentUnit === 'C' ? 'F' : 'C';

  // Animate thumb position
  if (currentUnit === 'F') {
    unitThumb.style.left = '4px'; // move to left
  } else {
    unitThumb.style.left = 'calc(100% - 36px)'; // move to right
  }

  // Re-fetch and update UI
  if (lastCoords) {
    fetchWeatherByCoords(lastCoords.lat, lastCoords.lon)
      .then(data => {
        renderCurrent(data, { name: lastCity, country: '' });
        renderForecast(data);
      })
      .catch(err => showError(err.message));
  }
});

/* ======= CITY SUGGESTIONS DROPDOWN ======= */
// Autocomplete for search input
searchInput.addEventListener('input', async () => {
  const query = searchInput.value.trim();

  if (query.length < 2) {
    suggestionsBox.classList.add('hidden');
    return;
  }

  const suggestions = await fetchCoordsSuggestions(query);

  if (!suggestions.length) {
    suggestionsBox.classList.add('hidden');
    return;
  }

  // Populate dropdown
  suggestionsBox.innerHTML = '';
  suggestions.forEach(loc => {
    const item = document.createElement('div');
    item.className = 'px-3 py-2 hover:bg-gray-100 cursor-pointer';
    item.textContent = `${loc.name}${loc.country ? ', ' + loc.country : ''}`;

    // Only set input value, do NOT call searchCity
    item.addEventListener('click', () => {
      searchInput.value = loc.name; 
      suggestionsBox.classList.add('hidden');
    });

    suggestionsBox.appendChild(item);
  });

  suggestionsBox.classList.remove('hidden');
});

// Hide suggestions if clicking outside
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.classList.add('hidden');
  }
});

/* ======= INITIAL LOAD ======= */
const initApp = () => {
  showLoader(); // Show loader immediately

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        searchByCoords(pos.coords.latitude, pos.coords.longitude)
          .finally(() => hideLoader()); // Hide loader after data loads
      },
      () => {
        searchCity('London').finally(() => hideLoader()); // Hide loader even if using fallback city
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  } else {
    searchCity('London').finally(() => hideLoader());
  }

  // Fallback: ensure loader disappears after 10s max
  setTimeout(() => hideLoader(), 10000);
};

initApp();
renderRecent();