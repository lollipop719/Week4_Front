import React from 'react';
import './WeatherAnimation.css';

const WeatherAnimation = ({ weather }) => {
  if (!weather || !weather.condition) {
    return null;
  }

  const getWeatherEffects = (condition) => {
    switch (condition) {
      case 'rain':
        return (
          <div className="weather-overlay rain">
            <div className="rain-container">
              {Array.from({ length: 100 }, (_, i) => (
                <div key={i} className="raindrop" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                }}></div>
              ))}
            </div>
          </div>
        );
      
      case 'light_fog':
      case 'moderate_fog':
      case 'heavy_fog':
        return (
          <div className="weather-overlay fog">
            <div className="fog-container">
              <div className="single-fog" style={{
                opacity: condition === 'heavy_fog' ? 1.0 : 
                        condition === 'moderate_fog' ? 0.8 : 0.6,
                animationDuration: `${60}s`
              }}></div>
            </div>
          </div>
        );
      
      case 'storm':
        return (
          <div className="weather-overlay storm">
            <div className="rain-container">
              {Array.from({ length: 120 }, (_, i) => (
                <div key={i} className="raindrop heavy" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.3 + Math.random() * 0.4}s`
                }}></div>
              ))}
            </div>
            <div className="lightning-container">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="lightning" style={{
                  animationDelay: `${Math.random() * 5 + i * 2}s`,
                  animationDuration: `${0.1 + Math.random() * 0.2}s`
                }}></div>
              ))}
            </div>
          </div>
        );
      
      case 'snow':
        return (
          <div className="weather-overlay snow">
            <div className="snow-container">
              {Array.from({ length: 80 }, (_, i) => (
                <div key={i} className="snowflake" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                  fontSize: `${8 + Math.random() * 8}px`
                }}>❄</div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return getWeatherEffects(weather.condition);
};

export default WeatherAnimation; 