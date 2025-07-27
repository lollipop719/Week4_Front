import React from "react";
import "./WeatherDisplay.css";

const WeatherDisplay = ({ weather }) => {
  if (!weather || !weather.length) {
    return (
      <div className="weather-display">
        <h2>🌤️ Weather</h2>
        <div className="weather-content">
          <p>No weather data available</p>
        </div>
      </div>
    );
  }

  const weatherData = weather[0]; // Take the first weather entry

  // Check if weatherData has all required properties
  if (!weatherData.condition || !weatherData.visibility || !weatherData.wind_speed || 
      !weatherData.wind_direction || !weatherData.temperature || !weatherData.pressure) {
    return (
      <div className="weather-display">
        <h2>🌤️ Weather</h2>
        <div className="weather-content">
          <p>Incomplete weather data</p>
        </div>
      </div>
    );
  }

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case "clear":
        return "☀️";
      case "light_fog":
        return "🌫️";
      case "moderate_fog":
        return "🌫️";
      case "heavy_fog":
        return "🌫️";
      case "rain":
        return "🌧️";
      case "snow":
        return "❄️";
      case "storm":
        return "⛈️";
      default:
        return "🌤️";
    }
  };

  const getConditionText = (condition) => {
    switch (condition) {
      case "clear":
        return "Clear";
      case "light_fog":
        return "Light Fog";
      case "moderate_fog":
        return "Moderate Fog";
      case "heavy_fog":
        return "Heavy Fog";
      case "rain":
        return "Rain";
      case "snow":
        return "Snow";
      case "storm":
        return "Storm";
      default:
        return "Unknown";
    }
  };

  const getWindDirection = (degrees) => {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className="weather-display">
      <h2>🌤️ Weather</h2>
      <div className="weather-content">
        <div className="weather-main">
          <div className="weather-condition">
            <div className="weather-icon">
              {getWeatherIcon(weatherData.condition)}
            </div>
            <div className="condition-text">
              {getConditionText(weatherData.condition)}
            </div>
          </div>
          
          <div className="wind-compass">
            <div className="compass-container">
              <div className="compass-rose">
                <div className="compass-point n">N</div>
                <div className="compass-point e">E</div>
                <div className="compass-point s">S</div>
                <div className="compass-point w">W</div>
                <div 
                  className="compass-needle"
                  style={{ transform: `rotate(${weatherData.wind_direction}deg)` }}
                ></div>
              </div>
              <div className="wind-speed">
                {weatherData.wind_speed.toFixed(1)} m/s
              </div>
              <div className="wind-direction-text">
                {getWindDirection(weatherData.wind_direction)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="weather-details">
          <div className="detail-item">
            <span className="detail-label">Visibility:</span>
            <span className="detail-value">{weatherData.visibility.toFixed(1)} km</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Temperature:</span>
            <span className="detail-value">{weatherData.temperature.toFixed(1)}°C</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Pressure:</span>
            <span className="detail-value">{weatherData.pressure.toFixed(0)} hPa</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay; 