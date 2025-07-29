import React, { useState, useEffect, useRef } from "react";
import "./RadarView.css";
import mapImage from "../assets/gimpo_map.png";
import planeImg from "../assets/plane.png";
import { PATHS } from "../data/paths";
import { getViewportSize } from "../utils/coordinateConverter";
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

// Original map dimensions for coordinate conversion
const ORIGINAL_MAP_WIDTH = 1536;
const ORIGINAL_MAP_HEIGHT = 703;

export default function RadarView({ flights, simTime, onRemoveFlight, runwayStatus, crashEvents }) {
  // Store state start times in a ref so they persist across renders
  const stateStartTimes = useRef({});
  // Track timeouts for each flight
  const dormantTimeouts = useRef({});
  const crashPositions = useRef({});
  // Track previous rotations to ensure smooth transitions
  const previousRotations = useRef({});
  // Track transition states for smooth taxiToRunway -> taxiToGate transitions
  const transitionStates = useRef({});
  const previousFlightStates = useRef({}); 
  const mapContainerRef = useRef(null);
  const [viewportSize, setViewportSize] = useState(getViewportSize());

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize(getViewportSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all transition states when component unmounts
      transitionStates.current = {};
    };
  }, []);

  // Update stateStartTimes when status changes
  useEffect(() => {
    flights.forEach(flight => {
      const prevState = previousFlightStates.current[flight.flight_id];
      const prevStatus = prevState ? prevState.status : null;
      const prevRunway = prevState ? prevState.runway : null;
  
      console.log(`🚨 State: ${flight.flight_id} from ${prevStatus} to ${flight.status}`);
  
      if (prevStatus === "taxiToRunway" && flight.status === "taxiToGate") {
        // Detected your special transition
        handleTaxiTransition(flight, {
          status: prevStatus,
          runway: prevRunway,
          stateStartTime: prevState.stateStartTime
        });
      } else if (!prevState || prevStatus !== flight.status) {
        // Normal status change
        stateStartTimes.current[flight.flight_id] = {
          status: flight.status,
          stateStartTime: simTime
        };
      }
  
      // Update snapshot for next frame
      previousFlightStates.current[flight.flight_id] = {
        status: flight.status,
        runway: flight.runway,
        stateStartTime: stateStartTimes.current[flight.flight_id]?.stateStartTime || simTime
      };
    });
  }, [flights, simTime]);

  // Handle transition from taxiToRunway to taxiToGate
  const handleTaxiTransition = (flight, prevState) => {
    const oldPathKey = `${prevState.status}_${flight.runway}`;
    const newPathKey = `${flight.status}_${flight.runway}`;
    
    console.log(`🔄 Processing transition for ${flight.flight_id}: ${oldPathKey} -> ${newPathKey}`);
    
    // Get the old and new paths
    const oldPath = PATHS[oldPathKey];
    const newPath = PATHS[newPathKey];
    
    if (!oldPath || !newPath) {
      console.warn(`⚠️ Paths not found for transition: ${oldPathKey} or ${newPathKey}`);
      // Fallback to normal behavior if paths not found
      stateStartTimes.current[flight.flight_id] = {
        status: flight.status,
        stateStartTime: simTime
      };
      return;
    }

    // Calculate current position in old path
    const elapsed = simTime - prevState.stateStartTime;
    const duration = DURATION[prevState.status] || 1;
    let progress = Math.min(Math.max(elapsed / duration, 0), 1);
    
    // Apply waiting logic for old path
    const waitingIdx = oldPath.findIndex(p => p.waiting);
    if (waitingIdx !== -1) {
      const occupied = flights.some(f =>
        ["landing_14L", "landing_32R", "takeOff_14L", "takeOff_32R"].includes(`${f.status}_${f.runway}`) &&
        f.flight_id !== flight.flight_id
      );
      if (occupied) {
        const waitingProgress = waitingIdx / (oldPath.length - 1);
        if (progress <= waitingProgress) {
          progress = waitingProgress;
        }
      }
    }

    const currentIndex = Math.floor(progress * (oldPath.length - 1));
    const currentPosition = oldPath[currentIndex] || oldPath[0];
    
    // Find the nearest point in the new path
    const nearestIndex = findNearestPoint(currentPosition, newPath);
    const nearestPosition = newPath[nearestIndex];
    
    // Calculate the progress in the new path based on the nearest point
    const newProgress = nearestIndex / (newPath.length - 1);
    
    // Store transition info for smooth animation
    transitionStates.current[flight.flight_id] = {
      fromPosition: currentPosition,
      toPosition: nearestPosition,
      transitionStartTime: simTime,
      newProgress: newProgress
    };
    
    // Update state start time to account for the progress at the nearest point
    // const adjustedStartTime = simTime - (newProgress * DURATION[flight.status]);
    // stateStartTimes.current[flight.flight_id] = {
    //   status: flight.status,
    //   stateStartTime: adjustedStartTime
    // };
    const adjustedStartTime = simTime - (newProgress * DURATION[flight.status]);
    stateStartTimes.current[flight.flight_id] = {
      status: flight.status,
      stateStartTime: adjustedStartTime
    };

    // ✅ Fix flicker: update previousFlightStates immediately
    previousFlightStates.current[flight.flight_id] = {
      status: flight.status,
      runway: flight.runway,
      stateStartTime: adjustedStartTime
    };
    
    console.log(`✅ Transition setup complete for ${flight.flight_id}: progress ${progress.toFixed(2)} -> ${newProgress.toFixed(2)}, adjustedStartTime=${adjustedStartTime}, simTime=${simTime}`);
  };

  // Find the nearest point in a path to a given position
  const findNearestPoint = (position, path) => {
    let minDistance = Infinity;
    let nearestIndex = 0;
    
    for (let i = 0; i < path.length; i++) {
      const pathPoint = path[i];
      const distance = Math.sqrt(
        Math.pow(position.x - pathPoint.x, 2) + 
        Math.pow(position.y - pathPoint.y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  };

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
            // Clean up transition state
            delete transitionStates.current[flight.flight_id];
          }, 1000); // 1 second delay
        }
      }
    });
    
    return () => {
      Object.values(dormantTimeouts.current).forEach(clearTimeout);
    };
  }, [flights, simTime, onRemoveFlight]);

  // Cleanup transition states when flights are removed
  useEffect(() => {
    const currentFlightIds = new Set(flights.map(f => f.flight_id));
    
    // Remove transition states for flights that no longer exist
    Object.keys(transitionStates.current).forEach(flightId => {
      if (!currentFlightIds.has(flightId)) {
        delete transitionStates.current[flightId];
      }
    });
  }, [flights]);

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

  // Helper to get position with on-the-fly coordinate conversion
  function getPlanePosition(flight, allFlights = []) {
    const { status, runway, flight_id } = flight;
    const pathKey = `${status}_${runway}`;
    const path = PATHS[pathKey];
    if (!path) return { x: 0, y: 0, rot: 0 };

    // Check if this flight is in transition
    const transitionState = transitionStates.current[flight_id];
    if (transitionState) {
      return getTransitionPosition(flight, transitionState, path);
    }

    // Check if this should be a transition but transition state hasn't been set up yet
    const prevState = previousFlightStates.current[flight_id];
    if (prevState && prevState.status === "taxiToRunway" && status === "taxiToGate") {
      // This is a transition that hasn't been set up yet, maintain previous position
      const oldPathKey = `${prevState.status}_${prevState.runway}`;
      const oldPath = PATHS[oldPathKey];
      if (oldPath && prevState.stateStartTime) {
        const elapsed = simTime - prevState.stateStartTime;
        const duration = DURATION[prevState.status] || 1;
        let progress = Math.min(Math.max(elapsed / duration, 0), 1);
        
        // Apply waiting logic for old path
        const waitingIdx = oldPath.findIndex(p => p.waiting);
        if (waitingIdx !== -1) {
          const occupied = allFlights.some(f =>
            ["landing_14L", "landing_32R", "takeOff_14L", "takeOff_32R"].includes(`${f.status}_${f.runway}`) &&
            f.flight_id !== flight_id
          );
          if (occupied) {
            const waitingProgress = waitingIdx / (oldPath.length - 1);
            if (progress <= waitingProgress) {
              progress = waitingProgress;
            }
          }
        }
        
        const index = Math.floor(progress * (oldPath.length - 1));
        const pixelPos = oldPath[index] || oldPath[0];
        
        return convertToRelative(pixelPos);
      }
    }

    // Check for waiting to landing transition with runway mismatch
    // if (prevState && prevState.status === "waiting" && status === "landing") {
    //   // If runway changed during the transition, use the previous runway until it stabilizes
    //   if (prevState.runway && runway && prevState.runway !== runway) {
    //     console.log(`🛬 Runway mismatch for ${flight_id}: ${prevState.runway} -> ${runway}, using previous runway temporarily`);
    //     const oldPathKey = `${status}_${prevState.runway}`;
    //     const oldPath = PATHS[oldPathKey];
    //     if (oldPath) {
    //       return convertToRelative(oldPath[0]);
    //     }
    //   }
      
    //   // Also check if the runway assignment is still pending (no runway assigned yet)
    //   if (!runway && prevState.runway) {
    //     console.log(`🛬 No runway assigned yet for ${flight_id}, using previous runway ${prevState.runway}`);
    //     const oldPathKey = `${status}_${prevState.runway}`;
    //     const oldPath = PATHS[oldPathKey];
    //     if (oldPath) {
    //       return convertToRelative(oldPath[0]);
    //     }
    //   }
    // }
    // Check for waiting to landing transition, and fix runway mismatch immediately
    if (prevState && prevState.status === "waiting" && status === "landing") {
      if (prevState.runway && runway && prevState.runway !== runway) {
        console.log(`🛬 Runway changed for ${flight_id}: ${prevState.runway} -> ${runway}. Updating immediately.`);
        
        // Update stateStartTimes to use new runway
        stateStartTimes.current[flight_id] = {
          status: status,
          runway: runway,
          stateStartTime: simTime
        };
        
        // Also update previousFlightStates so it doesn't mismatch next frame
        previousFlightStates.current[flight_id] = {
          status: status,
          runway: runway,
          stateStartTime: simTime
        };

        // Use the new path's start position immediately
        return convertToRelative(path[0]);
      }
    }

    // Ensure start info exists
    if (!stateStartTimes.current[flight_id]) {
      stateStartTimes.current[flight_id] = {
        status: flight.status,
        runway: flight.runway,
        stateStartTime: simTime
      };
      // For new flights, start at the first position immediately
      return convertToRelative(path[0]);
    }

    const startInfo = stateStartTimes.current[flight_id];
    
    // If status changed, update start time
    if (startInfo.status !== flight.status) {
      startInfo.status = flight.status;
      startInfo.stateStartTime = simTime;
      startInfo.runway = flight.runway;
      // For status changes, also start at the first position of the new path
      return convertToRelative(path[0]);
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
        if (occupied) {
          const waitingProgress = waitingIdx / (path.length - 1);
          // Only reset to waiting point if we haven't passed it yet
          if (progress <= waitingProgress) {
            progress = waitingProgress;
          }
          // If we've already passed the waiting point, continue normally
        }
      }
    }

    const index = Math.floor(progress * (path.length - 1));
    const pixelPos = path[index] || path[0];
    
    // Convert to relative coordinates on-the-fly
    return convertToRelative(pixelPos);
  }

  // Handle position calculation during transition
  const getTransitionPosition = (flight, transitionState, path) => {
    const { fromPosition, toPosition, transitionStartTime, newProgress } = transitionState;
    
    // Calculate time since transition started
    const transitionElapsed = simTime - transitionStartTime;
    const transitionDuration = 2; // 2 seconds for smooth transition

    if (transitionElapsed <= 0) {
      return convertToRelative(fromPosition);
    }
    
    if (transitionElapsed < transitionDuration) {
      // During transition period, interpolate between old and new positions
      const transitionProgress = transitionElapsed / transitionDuration;
      
      // Interpolate between current position and target position
      const interpolatedX = fromPosition.x + (toPosition.x - fromPosition.x) * transitionProgress;
      const interpolatedY = fromPosition.y + (toPosition.y - fromPosition.y) * transitionProgress;
      
      console.log(`🔄 Transitioning ${flight.flight_id}: ${transitionProgress.toFixed(2)} complete`);
      
      return convertToRelative({
        x: interpolatedX,
        y: interpolatedY,
        rot: toPosition.rot || 0
      });
    } else {
      // Transition complete, continue normal animation from the nearest point
      const elapsed = simTime - stateStartTimes.current[flight.flight_id].stateStartTime;
      const duration = DURATION[flight.status] || 1;
      let progress = Math.min(Math.max(elapsed / duration, 0), 1);
      
      console.log(`🔍 Post-transition progress for ${flight.flight_id}: elapsed=${elapsed}, duration=${duration}, progress=${progress.toFixed(2)}, newProgress=${newProgress.toFixed(2)}`);
      
      // Apply waiting logic
      const waitingIdx = path.findIndex(p => p.waiting);
      if (waitingIdx !== -1) {
        const occupied = flights.some(f =>
          ["landing_14L", "landing_32R", "takeOff_14L", "takeOff_32R"].includes(`${f.status}_${f.runway}`) &&
          f.flight_id !== flight.flight_id
        );
        if (occupied) {
          const waitingProgress = waitingIdx / (path.length - 1);
          if (progress <= waitingProgress) {
            progress = waitingProgress;
          }
        }
      }
      
      const index = Math.floor(progress * (path.length - 1));
      const pixelPos = path[index] || path[0];
      
      console.log(`📍 Final position for ${flight.flight_id}: index=${index}, position=(${pixelPos.x}, ${pixelPos.y})`);
      
      // Clear transition state after completion
      delete transitionStates.current[flight.flight_id];
      
      return convertToRelative(pixelPos);
    }
  };

  // Helper to convert pixel coordinates to relative coordinates
  function convertToRelative(pixelPos) {
    // Since background-size is 'auto', the image maintains its original size
    // and gets centered in the viewport, so we need to account for the centering offset
    const imageWidth = ORIGINAL_MAP_WIDTH;
    const imageHeight = ORIGINAL_MAP_HEIGHT;
    
    // Calculate the offset to center the image in the viewport
    const offsetX = (viewportSize.width - imageWidth) / 2;
    const offsetY = (viewportSize.height - imageHeight) / 2;
    
    // Convert pixel coordinates to viewport coordinates
    const viewportX = pixelPos.x + offsetX;
    const viewportY = pixelPos.y + offsetY;
    
    return {
      x: viewportX,
      y: viewportY,
      rot: pixelPos.rot || 0
    };
  }

  return (
    <div className="radar-view" ref={mapContainerRef}>
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