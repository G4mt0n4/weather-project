
import { API_KEY } from './config.js';

// DOM Elements
const elements = {
    searchInput: document.querySelector('.search-input'),
    searchBtn: document.querySelector('.search-button'),
    errorMsg: document.getElementById('errorMsg'),
    condition: document.getElementById('condition'),
    temp: document.getElementById('temp'),
    location: document.getElementById('location'),
    rainValue: document.getElementById('rain-value'),
    windSpeedValue: document.getElementById('wind-speed-value'),
    feelsLikeValue: document.getElementById('feels-like-value'),
    sunriseValue: document.getElementById('sunrise-value'),
    sunsetValue: document.getElementById('sunset-value'),
    visibilityValue: document.getElementById('uv-index-value'),
    checklist: document.getElementById('checklist'),
    reminderText: document.getElementById('reminderText')
};

let currentCity = '';

// Event Listeners
elements.searchBtn.addEventListener('click', handleSearch);
elements.searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
elements.checklist.addEventListener('click', handleChecklistClick);

// Main functions
async function handleSearch() {
    const city = elements.searchInput.value.trim();
    
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    if (city.length < 2) {
        showError('City name must be at least 2 characters long');
        return;
    }

    if (city.toLowerCase() === currentCity.toLowerCase()) {
        showError('Already displaying weather for this city. Please try a different city!');
        return;
    }

    await getWeather(city);
}

async function getWeather(city) {
    try {
        hideError();
        
        // Show loading state
        elements.condition.textContent = 'Loading weather data...';
        elements.temp.textContent = '--°';
        
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found. Please check the spelling and try again.');
            }
            if (response.status === 401) {
                throw new Error('API key error. Please check your configuration.');
            }
            throw new Error('Unable to fetch weather data. Please try again.');
        }

        const data = await response.json();
        currentCity = city;
        
        displayWeather(data);
        updateChecklist(data);
        elements.searchInput.value = '';

    } catch (error) {
        showError(error.message);
        console.error('Weather fetch error:', error);
    }
}

function displayWeather(data) {
    const { main, weather, wind, rain, sys, visibility } = data;
    const tempC = Math.round(main.temp);
    const tempF = Math.round((main.temp * 9/5) + 32);
    const feelsC = Math.round(main.feels_like);
    const feelsF = Math.round((main.feels_like * 9/5) + 32);
    const windKmh = Math.round(wind.speed * 3.6);
    const windMph = Math.round(wind.speed * 2.237);
    
    elements.condition.textContent = weather[0].description;
    elements.temp.textContent = `${tempC}°C / ${tempF}°F`;
    elements.location.textContent = `${data.name}, ${sys.country}`;
    
    const rainAmount = rain ? (rain['1h'] || 0) : 0;
    elements.rainValue.textContent = rainAmount > 0 ? `${rainAmount} mm` : '0 mm';
    elements.windSpeedValue.textContent = `${windKmh} kph / ${windMph} mph`;
    elements.feelsLikeValue.textContent = `${feelsC}°C / ${feelsF}°F`;
    
    // Convert sunrise/sunset to local timezone
    const timezoneOffset = data.timezone || 0; // timezone offset in seconds from UTC
    const sunriseTime = new Date((sys.sunrise + timezoneOffset) * 1000);
    const sunsetTime = new Date((sys.sunset + timezoneOffset) * 1000);
    
    // Format times in 12-hour format
    const formatTime = (date) => {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
    };
    
    elements.sunriseValue.textContent = formatTime(sunriseTime);
    elements.sunsetValue.textContent = formatTime(sunsetTime);
    
    // Fix visibility - check if it exists and is valid
    let visibilityText = 'N/A';
    if (visibility && visibility > 0) {
        const visibilityKm = Math.round(visibility / 1000);
        visibilityText = `${visibilityKm} km`;
    }
    elements.visibilityValue.textContent = visibilityText;
}

function updateChecklist(data) {
    const { main, weather, wind, rain } = data;
    const tempC = main.temp;
    const tempF = (tempC * 9/5) + 32;
    const condition = weather[0].main.toLowerCase();
    const windSpeed = wind.speed * 3.6;
    const rainAmount = rain ? (rain['1h'] || 0) : 0;
    
    const messages = {
        hot: `🌡️ Very hot! ${Math.round(tempC)}°C / ${Math.round(tempF)}°F - Walk early morning or late evening only!`,
        warm: `☀️ Hot weather! ${Math.round(tempC)}°C / ${Math.round(tempF)}°F - Bring water and watch for hot surfaces.`,
        freezing: `🥶 Freezing! ${Math.round(tempC)}°C / ${Math.round(tempF)}°F - Dress warmly and watch for ice.`,
        cold: `❄️ Cold weather! ${Math.round(tempC)}°C / ${Math.round(tempF)}°F - Bundle up for your walk.`,
        rain: `🌧️ Rain detected! ${rainAmount}mm - Bring waterproof gear.`,
        windy: `💨 Very windy! ${Math.round(windSpeed)} km/h - Be careful of debris.`,
        good: `🚶‍♀️ Great walking weather! ${Math.round(tempC)}°C / ${Math.round(tempF)}°F`
    };
    
    let message = messages.good;
    if (tempF > 85) message = messages.hot;
    else if (tempF > 70) message = messages.warm;
    else if (tempF < 32) message = messages.freezing;
    else if (tempF < 45) message = messages.cold;
    else if (rainAmount > 0 || condition.includes('rain')) message = messages.rain;
    else if (windSpeed > 30) message = messages.windy;
    
    elements.reminderText.textContent = message;
    displayChecklistItems(getChecklistItems(tempF, condition, windSpeed, rainAmount));
}

function getChecklistItems(tempF, condition, windSpeed, rainAmount) {
    const baseItems = ['Phone', 'Keys', 'Wallet'];
    const items = [...baseItems];
    
    // Temperature-based items
    if (tempF > 85) items.push('Water bottle', 'Sunglasses', 'Hat', 'Sunscreen');
    else if (tempF > 70) items.push('Water bottle', 'Sunglasses', 'Hat');
    else if (tempF < 32) items.push('Heavy jacket', 'Gloves', 'Hat', 'Winter boots');
    else if (tempF < 45) items.push('Warm jacket', 'Gloves', 'Hat');
    else if (tempF < 60) items.push('Light jacket');
    
    // Weather-based items
    if (rainAmount > 0 || condition.includes('rain')) items.push('Umbrella', 'Rain jacket', 'Waterproof shoes');
    if (condition.includes('snow')) items.push('Winter boots', 'Extra socks', 'Scarf');
    if (windSpeed > 25) items.push('Windbreaker');
    
    return items;
}

function displayChecklistItems(items) {
    elements.checklist.innerHTML = items.map(item => `
        <li class="checklist-item">
            <div class="checklist-circle"></div>
            <span class="checklist-text">${item}</span>
        </li>
    `).join('');
}

function handleChecklistClick(e) {
    const item = e.target.closest('.checklist-item');
    if (item) item.classList.toggle('checked');
}

function showError(message) {
    elements.errorMsg.textContent = message;
    elements.errorMsg.style.display = 'block';
    setTimeout(hideError, 5000);
}

function hideError() {
    elements.errorMsg.style.display = 'none';
}

