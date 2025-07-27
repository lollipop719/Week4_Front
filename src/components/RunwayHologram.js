import React, { useState, useEffect } from "react";
import "./RunwayHologram.css";
import { getViewportSize } from "../utils/coordinateConverter";

// Original map dimensions for coordinate conversion
const ORIGINAL_MAP_WIDTH = 1536;
const ORIGINAL_MAP_HEIGHT = 703;

// Runway configurations in original pixel coordinates
const RUNWAY_CONFIG_PIXELS = {
  "14L": { x: 920, y: 465, rotation: 45, length: 450 },
  "14R": { x: 870, y: 480, rotation: 45, length: 400 }
};

export default function RunwayHologram({ runwayStatus = {} }) {
  const [viewportSize, setViewportSize] = useState(getViewportSize());

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize(getViewportSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to convert pixel coordinates to viewport coordinates
  function convertToViewport(pixelConfig) {
    // Since background-size is 'auto', the image maintains its original size
    // and gets centered in the viewport, so we need to account for the centering offset
    const imageWidth = ORIGINAL_MAP_WIDTH;
    const imageHeight = ORIGINAL_MAP_HEIGHT;
    
    // Calculate the offset to center the image in the viewport
    const offsetX = (viewportSize.width - imageWidth) / 2;
    const offsetY = (viewportSize.height - imageHeight) / 2;
    
    // Convert pixel coordinates to viewport coordinates
    const viewportX = pixelConfig.x + offsetX;
    const viewportY = pixelConfig.y + offsetY;
    
    // Scale the length proportionally to maintain visual consistency
    const scaleFactor = Math.min(viewportSize.width / ORIGINAL_MAP_WIDTH, viewportSize.height / ORIGINAL_MAP_HEIGHT);
    const viewportLength = pixelConfig.length * scaleFactor;
    
    return {
      x: viewportX,
      y: viewportY,
      rotation: pixelConfig.rotation,
      length: viewportLength
    };
  }

  const renderRunway = (runwayId) => {
    const pixelConfig = RUNWAY_CONFIG_PIXELS[runwayId];
    if (!pixelConfig) return null;

    // Convert to viewport coordinates
    const config = convertToViewport(pixelConfig);
    
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
      {Object.keys(RUNWAY_CONFIG_PIXELS).map(renderRunway)}
    </div>
  );
} 