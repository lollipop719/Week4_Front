import React from "react";
import "./RunwayHologram.css";

const RUNWAY_CONFIG = {
  "14L": { x: 920, y: 465, rotation: 45, length: 450 },
  "14R": { x: 870, y: 480, rotation: 45, length: 400 }
};

export default function RunwayHologram({ runwayStatus = {} }) {
  const renderRunway = (runwayId) => {
    const config = RUNWAY_CONFIG[runwayId];
    if (!config) return null;

    const status = runwayStatus[runwayId] || { isClosed: false, isInverted: false };
    const baseRotation = config.rotation;
    
    const hologramClass = `runway-hologram ${status.isClosed ? 'closed' : 'active'}`;
    const directionClass = status.isClosed ? 'direction-xxx' : 'direction-arrow';

    return (
      <div
        key={runwayId}
        className={hologramClass}
        style={{
          left: `${config.x}px`,
          top: `${config.y}px`,
          transform: `translate(-50%, -50%) rotate(${baseRotation}deg)`,
          width: `${config.length}px`
        }}
      >
        <div className={directionClass}>
          {status.isClosed ? 'XXX' : (status.isInverted ? '←←←' : '→→→')}
        </div>
      </div>
    );
  };

  return (
    <div className="runway-holograms-container">
      {Object.keys(RUNWAY_CONFIG).map(renderRunway)}
    </div>
  );
} 