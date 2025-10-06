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