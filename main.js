import { key } from './config.js';

async function getWeather(city) {
    const url = `http://api.weatherapi.com/v1/current.json?key=${key}&q=${city}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // WeatherAPI structure is different:
    console.log('Temp:', data.current.temp_c + '°C');
    console.log('Condition:', data.current.condition.text);
    console.log('Location:', data.location.name);
}

getWeather("new york")