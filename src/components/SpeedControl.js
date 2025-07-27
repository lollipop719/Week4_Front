import React from 'react';
import './SpeedControl.css';

const SpeedControl = ({ speed, onSpeedChange }) => {
  const speeds = [1, 2, 4, 8, 64];

  return (
    <div className="speed-control">
      <div className="speed-control-container">
        <div className="speed-label">배속</div>
        <div className="speed-buttons">
          {speeds.map((speedOption) => (
            <button
              key={speedOption}
              className={`speed-button ${speed === speedOption ? 'active' : ''}`}
              onClick={() => onSpeedChange(speedOption)}
            >
              {speedOption}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpeedControl; 