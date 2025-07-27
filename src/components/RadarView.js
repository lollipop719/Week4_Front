import React, { useEffect, useRef } from "react";
import mapImage from "../assets/gimpo_map.png";
import { PATHS } from "../data/paths";
import "./RadarView.css";
import planeImg from "../assets/plane.png";
import RunwayHologram from "./RunwayHologram";

// Helper to calculate rotation between two points
function getRotationDegrees(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

// Helper to normalize angle to shortest path
function normalizeAngle(angle) {
  // Normalize to -180 to 180 degrees
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

// Helper to get shortest rotation path
function getShortestRotation(fromAngle, toAngle) {
  const diff = normalizeAngle(toAngle - fromAngle);
  return fromAngle + diff;
}

// Compute rotation for all paths (mutates PATHS in-place)
function computeAllRotations(paths) {
  Object.values(paths).forEach(path => {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      path[i].rot = getRotationDegrees(a.x, a.y, b.x, b.y);
    }
    if (path.length > 1) {
      path[path.length - 1].rot = path[path.length - 2].rot;
    } else if (path.length === 1) {
      path[0].rot = 0;
    }
  });
}

// Only compute once
computeAllRotations(PATHS);

// Duration for each status (in seconds)
const DURATION = {
  taxiToRunway: 600, // 10 min
  takeOff: 60,      // 1 min
  landing: 60,      // 1 min
  taxiToGate: 600,  // 10 min
};

export default function RadarView({ flights, simTime, onRemoveFlight, runwayStatus, crashEvents }) {
  // Store state start times in a ref so they persist across renders
  const stateStartTimes = useRef({});
  // Track timeouts for each flight
  const dormantTimeouts = useRef({});
  const crashPositions = useRef({});
  // Track previous rotations to ensure smooth transitions
  const previousRotations = useRef({});

  // Update stateStartTimes when status changes
  useEffect(() => {
    flights.forEach(flight => {
      const prev = stateStartTimes.current[flight.flight_id];
      if (!prev || prev.status !== flight.status) {
        stateStartTimes.current[flight.flight_id] = {
          status: flight.status,
          stateStartTime: simTime
        };
      }
    });
  }, [flights, simTime]);

  // Handle setting to dormant after animation ends
  useEffect(() => {
    flights.forEach(flight => {
      if ((flight.status === "taxiToGate" || flight.status === "takeOff") && !dormantTimeouts.current[flight.flight_id]) {
        const startInfo = stateStartTimes.current[flight.flight_id];
        if (!startInfo) return;
        const elapsed = simTime - startInfo.stateStartTime;
        const duration = DURATION[flight.status] || 1;
        const progress = Math.min(Math.max(elapsed / duration, 0), 1);
        
        console.log(`Flight ${flight.flight_id}: status=${flight.status}, elapsed=${elapsed}, duration=${duration}, progress=${progress}`);
        
        if (progress >= 1) {
          console.log(`Setting timeout to remove flight ${flight.flight_id}`);
          dormantTimeouts.current[flight.flight_id] = setTimeout(() => {
            console.log(`Removing flight ${flight.flight_id}`);
            if (onRemoveFlight) {
              onRemoveFlight(flight.flight_id);
            }
            delete dormantTimeouts.current[flight.flight_id];
            // Clean up rotation tracking
            delete previousRotations.current[flight.flight_id];
          }, 1000); // 1 second delay
        }
      }
    });
    
    return () => {
      Object.values(dormantTimeouts.current).forEach(clearTimeout);
    };
  }, [flights, simTime, onRemoveFlight]);

  // Store the position at the start of the crash
  useEffect(() => {
    Object.entries(crashEvents).forEach(([flight_id, crash]) => {
      if (!crashPositions.current[flight_id]) {
        const flight = flights.find(f => f.flight_id === flight_id);
        if (flight) {
          crashPositions.current[flight_id] = getPlanePosition(flight, flights);
        }
      }
    });
    // Clean up positions for ended crashes
    Object.keys(crashPositions.current).forEach(flight_id => {
      if (!crashEvents[flight_id]) {
        delete crashPositions.current[flight_id];
      }
    });
  }, [crashEvents, flights]);

  // Helper to get position
  function getPlanePosition(flight, allFlights = []) {
    const { status, runway, flight_id } = flight;
    const pathKey = `${status}_${runway}`;
    const path = PATHS[pathKey];
    if (!path) return { x: 0, y: 0, rot: 0 };

    // Ensure start info exists
    if (!stateStartTimes.current[flight_id]) {
      stateStartTimes.current[flight_id] = {
        status: flight.status,
        stateStartTime: simTime
      };
    }

    const startInfo = stateStartTimes.current[flight_id];
    
    // If status changed, update start time
    if (startInfo.status !== flight.status) {
      startInfo.status = flight.status;
      startInfo.stateStartTime = simTime;
    }

    const elapsed = simTime - startInfo.stateStartTime;
    const duration = DURATION[status] || 1;
    let progress = Math.min(Math.max(elapsed / duration, 0), 1);

    // Runway waiting logic for all four taxi cases
    if (
      status === "taxiToRunway" || status === "taxiToGate"
    ) {
      const waitingIdx = path.findIndex(p => p.waiting);
      if (waitingIdx !== -1) {
        // Check if ANY plane is doing landing_14L, landing_32R, takeOff_14L, or takeOff_32R
        const occupied = allFlights.some(f =>
          ["landing_14L", "landing_32R", "takeOff_14L", "takeOff_32R"].includes(`${f.status}_${f.runway}`) &&
          f.flight_id !== flight_id
        );
        console.log(`Plane ${flight.flight_id} waiting check: occupied=${occupied}, progress=${progress}, waitingProgress=${waitingIdx / (path.length - 1)}`);
        if (occupied) {
          const waitingProgress = waitingIdx / (path.length - 1);
          if (progress > waitingProgress) {
            progress = waitingProgress;
          }
        }
      }
    }

    const index = Math.floor(progress * (path.length - 1));
    return path[index] || path[0];
  }

  return (
    <div className="radar-view">
      <div
        className="map-background"
        style={{ backgroundImage: `url(${mapImage})` }}
      ></div>
      <div className="planes-overlay">
        {flights.filter(f => f.status !== "dormant").map(flight => {
          const isCrashed = crashEvents[flight.flight_id];
          // Use frozen position if crashed, else animated
          const pos = isCrashed && crashPositions.current[flight.flight_id]
            ? crashPositions.current[flight.flight_id]
            : getPlanePosition(flight, flights);
          
          // Calculate smooth rotation
          const targetRotation = (pos.rot || 0) + 85;
          const prevRotation = previousRotations.current[flight.flight_id] || targetRotation;
          const smoothRotation = getShortestRotation(prevRotation, targetRotation);
          
          // Update previous rotation for next frame
          previousRotations.current[flight.flight_id] = smoothRotation;
          
          return (
            <div
              key={flight.flight_id}
              className={`plane ${isCrashed ? 'crashed' : ''}`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: `translate(-50%, -50%) rotate(${smoothRotation}deg)`,
                filter: isCrashed ? 'brightness(1.5) saturate(2) hue-rotate(0deg)' : 'none'
              }}
              title={`${flight.flight_id} - ${flight.status}${isCrashed ? ' - CRASHED!' : ''}`}
            >
              <img 
                src={planeImg} 
                alt="plane" 
                className={`plane-img${isCrashed ? ' crashed' : ''}`}
                style={{ 
                  width: 32, 
                  height: 32, 
                  display: "block"
                }} 
              />
              <div
                style={{
                  fontSize: 12,
                  textAlign: "center",
                  transform: `rotate(-${smoothRotation}deg)`,
                  marginTop: 2,
                  color: isCrashed ? '#ff4444' : 'inherit',
                  fontWeight: isCrashed ? 'bold' : 'normal'
                }}
              >
                {flight.flight_id}
              </div>
            </div>
          );
        })}
      </div>
      <RunwayHologram runwayStatus={runwayStatus} />
    </div>
  );
}