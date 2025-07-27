import React, { useState, useEffect } from "react";
import "./App.css";
import InfoBoard from "./components/InfoBoard";
import EventPanel from "./components/EventPanel";
import RadarView from "./components/RadarView";
import EventPopup from "./components/EventPopup";
import WeatherDisplay from "./components/WeatherDisplay";

const TEST_FLIGHTS = [
    // Add one for each path you want to test
    {
    flight_id: "TEST1",
    status: "takeOff",
    runway: "14L",
    airline: "Korean Air",
    depAirport: "CDG",
    arrivalAirport: "GMP",
    },
    {
    flight_id: "TEST2",
    status: "taxiToGate",
    runway: "14R",
    airline: "Korean Air",
    depAirport: "CDG",
    arrivalAirport: "GMP",
    },
];

function App() {
  const [flights, setFlights] = useState([]);
  const [ws, setWs] = useState(null);
  const [simTime, setSimTime] = useState(0);
  const [popupMessage, setPopupMessage] = useState('');
  const [crashEvents, setCrashEvents] = useState({});
  const [speed, setSpeed] = useState(1); // Current speed (confirmed by backend)
  const [pendingSpeed, setPendingSpeed] = useState(1); // Pending speed change
  const [runwayStatus, setRunwayStatus] = useState({}); // Runway status state
  const [weather, setWeather] = useState(null); // Weather state

  // Speed control intervals (in milliseconds)
  const speedIntervals = {
    1: 4000,  // 1x: 4 seconds per 10 sim minutes
    2: 2000,  // 2x: 2 seconds per 10 sim minutes
    4: 1000,  // 4x: 1 second per 10 sim minutes
    8: 500    // 8x: 0.5 seconds per 10 sim minutes
  };

  // Simulate time passing (4 seconds real time = 10 seconds sim time)
  useEffect(() => {
    const interval = setInterval(() => {
      setSimTime(prevTime => prevTime + 10); // 10 minutes = 600 seconds
    }, speedIntervals[speed]);
    return () => clearInterval(interval);
  }, [speed]);

  useEffect(() => {
    // WebSocket connection setup
    const websocket = new WebSocket('ws://localhost:8765');
    websocket.onopen = () => { console.log('Connected to WebSocket'); };
    websocket.onmessage = (event) => {
      console.log('📨 Received message:', event.data);
      const data = JSON.parse(event.data);
      if (data.type === 'state_update') {
        console.log('🛩️ State update received:', data);
        const activeFlights = data.flights.filter(flight => flight.status !== 'dormant');
        setFlights(activeFlights);
        // Update simulation time from backend
        if (data.time) {
          const [hours, minutes] = data.time.split(':').map(Number);
          const simTimeInSeconds = hours * 3600 + minutes * 60;
          setSimTime(simTimeInSeconds);
        }
        // Update weather from backend
        if (data.weather) {
          console.log('🌤️ Weather data received:', data.weather);
          setWeather(data.weather);
        }
      } else if (data.type === 'speed_control_response') {
        console.log('🚀 Speed control response:', data);
        if (data.success) {
          setSpeed(data.speed); // Apply the confirmed speed
          setPendingSpeed(data.speed); // Update pending speed to match
        } else {
          console.error('Speed control failed');
          setPendingSpeed(speed); // Reset pending speed to current speed
        }
      }
    };
    websocket.onerror = (error) => { console.error('WebSocket error:', error); };
    websocket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
    };
    
    setWs(websocket);
    return () => { websocket.close(); };
  }, []);

  const generatePopupMessage = (eventData) => {
    const { event_type, target, duration } = eventData;
    
    switch (event_type) {
      case 'EMERGENCY_LANDING':
        return `Flight ${target} now has to land within ${duration} minutes!`;
      case 'RUNWAY_CLOSURE':
        return `Runway ${target} will be closed for ${duration} minutes!`;
      case 'FLIGHT_CANCEL':
        return `Flight ${target} has been cancelled!`;
      case 'FLIGHT_DELAY':
        return `Flight ${target} has been delayed for ${duration} minutes!`;
      case 'GO_AROUND':
        return `Flight ${target} will go around and landing will be delayed by ${duration} minutes!`;
      case 'TAKEOFF_CRASH':
        return `Flight ${target} has crashed while taking off!`;
      case 'LANDING_CRASH':
        return `Flight ${target} has crashed while landing!`;
      case 'RUNWAY_INVERT':
        return `Runway directions have changed!`;
      default:
        return `Event ${event_type} has been triggered!`;
    }
  };

  const handleEventSubmit = (eventData) => {
    const eventMessage = {
      type: "event",
      time: Date.now(),
      event: eventData
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(eventMessage));
    }
    console.log('Event sent:', eventMessage); // For testing

    // Handle crash events
    if (eventData.event_type === 'TAKEOFF_CRASH' || eventData.event_type === 'LANDING_CRASH') {
      const targetFlight = flights.find(f => f.flight_id === eventData.target);
      const expectedStatus = eventData.event_type === 'TAKEOFF_CRASH' ? 'takeOff' : 'landing';
      
      if (!targetFlight || targetFlight.status !== expectedStatus) {
        // Show error message
        const errorMsg = eventData.event_type === 'TAKEOFF_CRASH' 
          ? `The plane ${eventData.target} is not currently taking off!`
          : `The plane ${eventData.target} is not currently landing!`;
        setPopupMessage(errorMsg);
        return;
      }
      
      // Apply crash effect
      const duration = eventData.duration * 1000; // Convert to milliseconds
      setCrashEvents(prev => ({
        ...prev,
        [eventData.target]: {
          type: eventData.event_type,
          startTime: Date.now(),
          duration: duration
        }
      }));
      
      // Remove crash effect after duration
      setTimeout(() => {
        setCrashEvents(prev => {
          const newEvents = { ...prev };
          delete newEvents[eventData.target];
          return newEvents;
        });
        // Show resolved popup
        const resolvedMsg = `The crash has been resolved. The plane ${eventData.target} will resume ${eventData.event_type === 'TAKEOFF_CRASH' ? 'take off' : 'landing'}`;
        setPopupMessage(resolvedMsg);
      }, duration);
    }

    // Show popup message
    const popupMsg = generatePopupMessage(eventData);
    setPopupMessage(popupMsg);

    // Handle runway events locally for testing
    if (eventData.event_type === 'RUNWAY_CLOSURE') {
      // Map input to both directions
      const closureMap = {
        '14L': ['14L', '32R'],
        '32R': ['14L', '32R'],
        '14R': ['14R', '32L'],
        '32L': ['14R', '32L']
      };
      const runways = closureMap[eventData.target] || [eventData.target];
      const duration = eventData.duration * 1000; // Convert to milliseconds
      setRunwayStatus(prev => {
        const updated = { ...prev };
        runways.forEach(runway => {
          updated[runway] = { ...updated[runway], isClosed: true };
        });
        return updated;
      });
      // Reset after duration
      setTimeout(() => {
        setRunwayStatus(prev => {
          const updated = { ...prev };
          runways.forEach(runway => {
            updated[runway] = { ...updated[runway], isClosed: false };
          });
          return updated;
        });
      }, duration);
    }
    
    else if (eventData.event_type === 'RUNWAY_INVERT') {
      // Rotate 14L and 14R runways 180 degrees
      setRunwayStatus(prev => {
        const newStatus = { ...prev };
        ['14L', '14R'].forEach(runway => {
          if (newStatus[runway]) {
            newStatus[runway] = { ...newStatus[runway], isInverted: !newStatus[runway].isInverted };
          } else {
            newStatus[runway] = { isInverted: true, isClosed: false };
          }
        });
        return newStatus;
      });
    }
  };

  const handleRemoveFlight = (flight_id) => {
    console.log(`App.js: Removing flight ${flight_id}`);
    setFlights(flights => {
      const newFlights = flights.filter(f => f.flight_id !== flight_id);
      console.log(`App.js: Flights after removal:`, newFlights);
      return newFlights;
    });
  };

  const closePopup = () => {
    setPopupMessage("");
  };

  const handleSpeedChange = (newSpeed) => {
    console.log(`🚀 Speed change requested: ${speed}x → ${newSpeed}x`);
    setPendingSpeed(newSpeed); // Set pending speed immediately for UI feedback
    if (ws && ws.readyState === WebSocket.OPEN) {
      const speedMessage = {
        type: "speed_control",
        speed: newSpeed
      };
      ws.send(JSON.stringify(speedMessage));
      console.log('Speed control sent:', speedMessage);
    } else {
      console.error('WebSocket not connected');
      setPendingSpeed(speed); // Reset if WebSocket not connected
    }
  };

  return (
    <div className="App">
      <InfoBoard 
        flights={flights} 
        simTime={simTime} 
        speed={pendingSpeed} 
        onSpeedChange={handleSpeedChange} 
      />
      <EventPanel onSubmit={handleEventSubmit} />
      <WeatherDisplay weather={weather} />
      <RadarView 
        flights={flights} 
        simTime={simTime} 
        onRemoveFlight={handleRemoveFlight}
        runwayStatus={runwayStatus}
        crashEvents={crashEvents}
      />
      {popupMessage && (
        <EventPopup message={popupMessage} onClose={closePopup} />
      )}
    </div>
  );
}

export default App;