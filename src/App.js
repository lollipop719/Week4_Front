import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import HomePage from "./components/HomePage";
import ResultsPage from "./components/ResultsPage";
import InfoBoard from "./components/InfoBoard";
import EventPanel from "./components/EventPanel";
import RadarView from "./components/RadarView";
import WeatherDisplay from "./components/WeatherDisplay";
import WeatherAnimation from "./components/WeatherAnimation";
import EventPopup from "./components/EventPopup";
import SpeedControl from "./components/SpeedControl";

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
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [simulationResults, setSimulationResults] = useState(null); // State for simulation results
  const [pendingRestart, setPendingRestart] = useState(null); // State for pending restart algorithm
  const pendingRestartRef = useRef(null); // Ref to store pending restart algorithm

  // Speed control intervals (in milliseconds)
  const speedIntervals = {
    1: 4000,  // 1x: 4 seconds per 10 sim minutes
    2: 2000,  // 2x: 2 seconds per 10 sim minutes
    4: 1000,  // 4x: 1 second per 10 sim minutes
    8: 500,   // 8x: 0.5 seconds per 10 sim minutes
    64: 62    // 64x: 0.062 seconds per 10 sim minutes (very fast!)
  };

  // Simulate time passing (4 seconds real time = 10 seconds sim time)
  useEffect(() => {
    if (!simulationStarted) return;
    
    const interval = setInterval(() => {
      setSimTime(prevTime => prevTime + 10); // 10 minutes = 600 seconds
    }, speedIntervals[speed]);
    return () => clearInterval(interval);
  }, [speed, simulationStarted]);

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

  const handleBackendEvent = (eventData) => {
    console.log('🎯 Processing backend event:', eventData);
    
    // Generate and show popup message
    const popupMsg = generatePopupMessage(eventData);
    setPopupMessage(popupMsg);
    
    // Handle different event types with their specific animations/effects
    switch (eventData.event_type) {
      case 'TAKEOFF_CRASH':
      case 'LANDING_CRASH':
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
        break;
        
      case 'RUNWAY_CLOSURE':
        // Map input to both directions
        const closureMap = {
          '14L': ['14L', '32R'],
          '32R': ['14L', '32R'],
          '14R': ['14R', '32L'],
          '32L': ['14R', '32L']
        };
        const runways = closureMap[eventData.target] || [eventData.target];
        const runwayDuration = eventData.duration * 1000; // Convert to milliseconds
        
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
        }, runwayDuration);
        break;
        
      case 'RUNWAY_INVERT':
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
        break;
        
      case 'EMERGENCY_LANDING':
        // Emergency landing creates new flights, so no special handling needed here
        // The backend will add the new flight to the state_update
        break;
        
      case 'FLIGHT_CANCEL':
      case 'FLIGHT_DELAY':
      case 'GO_AROUND':
        // These events are handled by the backend and reflected in state_update
        // No special frontend animations needed
        break;
        
      default:
        console.log('⚠️ Unknown event type:', eventData.event_type);
        break;
    }
  };

  const handleStartSimulation = (algorithm) => {
    setConnectionStatus('connecting');
    
    // Create WebSocket connection to Railway backend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'wss://week4server-production-d715.up.railway.app';
    const websocket = new WebSocket(backendUrl);
    
    websocket.onopen = () => { 
      console.log('Connected to Railway WebSocket backend');
      setConnectionStatus('connected');
      
      // Send start simulation message
      const startMessage = {
        type: 'start_simulation',
        algorithm: algorithm
      };
      websocket.send(JSON.stringify(startMessage));
      console.log('Sent start simulation message:', startMessage);
    };
    
    websocket.onmessage = (event) => {
      console.log('📨 Received message:', event.data);
      console.log('📨 Message type:', typeof event.data);
      console.log('📨 Message length:', event.data.length);
      
      let data;
      try {
        data = JSON.parse(event.data);
        console.log('📨 JSON parse successful');
        console.log('📨 Parsed data type (typeof):', typeof data);
        console.log('📨 Is array:', Array.isArray(data));
        console.log('📨 Data constructor:', data.constructor.name);
        console.log('📨 Data length:', data.length);
        
        // If the parsed result is still a string, parse it again
        if (typeof data === 'string') {
          console.log('📨 Parsed result is string, parsing again...');
          data = JSON.parse(data);
          console.log('📨 Second parse result type:', typeof data);
        }
        
        // If it's an array, take the first element
        if (Array.isArray(data)) {
          console.log('📨 Data is an array, taking first element');
          data = data[0];
        }
        
        console.log('📨 Final data:', data);
        console.log('📨 Final data type:', typeof data);
        console.log('📨 Final data keys:', Object.keys(data));
        console.log('📨 Has type property:', 'type' in data);
        console.log('📨 Type property value:', data['type']);
      } catch (error) {
        console.error('❌ JSON parse error:', error);
        return;
      }
      
      if (data.type === 'start_simulation_response') {
        console.log('🚀 Start simulation response:', data);
        if (data.success) {
          setSimulationStarted(true);
          setWs(websocket);
        } else {
          setConnectionStatus('disconnected');
          alert('Failed to start simulation');
        }
      } else if (data.type === 'state_update') {
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
      } else if (data.type === 'event') {
        console.log('🎯 Backend event received:', data);
        handleBackendEvent(data.event);
      } else if (data.type === 'simulation_results') {
        console.log('📊 Simulation results received:', data);
        console.log('📊 Setting simulation results state...');
        setSimulationResults(data);
        console.log('📊 Simulation results state set, should show ResultsPage');
      } else if (data.type === 'reset_simulation_response') {
        console.log('🔄 Reset simulation response received:', data);
        console.log('🔄 Pending restart algorithm (state):', pendingRestart);
        console.log('🔄 Pending restart algorithm (ref):', pendingRestartRef.current);
        console.log('🔄 WebSocket readyState:', ws ? ws.readyState : 'no ws');
        console.log('🔄 WebSocket OPEN state:', WebSocket.OPEN);
        if (data.success) {
          console.log('✅ Simulation reset successfully.');
          // After successful reset, start a new simulation if we have a pending restart
          const algorithmToUse = pendingRestartRef.current || pendingRestart;
          if (algorithmToUse) {
            console.log('🚀 Starting new simulation with algorithm:', algorithmToUse);
            
            // Create a fresh WebSocket connection for the restart
            console.log('🔄 Creating fresh WebSocket connection for restart...');
            const newWebSocket = new WebSocket(backendUrl); // 방금 내가 수정함
            
            newWebSocket.onopen = () => {
              console.log('🔄 Fresh WebSocket connected for restart');
              const startMessage = {
                type: 'start_simulation',
                algorithm: algorithmToUse
              };
              newWebSocket.send(JSON.stringify(startMessage));
              console.log('🚀 Sent start simulation message via fresh connection:', startMessage);
              setWs(newWebSocket);
              setPendingRestart(null);
              pendingRestartRef.current = null;
            };
            
            newWebSocket.onmessage = (event) => {
              console.log('🔄 Fresh WebSocket message:', event.data);
              const data = JSON.parse(event.data);
              if (data.type === 'start_simulation_response') {
                console.log('🚀 Start simulation response via fresh connection:', data);
                if (data.success) {
                  setSimulationStarted(true);
                } else {
                  setConnectionStatus('disconnected');
                  alert('Failed to start simulation: ' + (data.error || 'Unknown error'));
                }
              }
            };
            
            newWebSocket.onerror = (error) => {
              console.error('❌ Fresh WebSocket error:', error);
              setConnectionStatus('disconnected');
              alert('Failed to create new WebSocket connection for restart.');
            };
            
            newWebSocket.onclose = (event) => {
              console.log('🔌 Fresh WebSocket closed:', event.code, event.reason);
              setConnectionStatus('disconnected');
            };
            
          } else {
            console.log('⚠️ No pending restart algorithm found after reset');
          }
        } else {
          console.error('❌ Failed to reset simulation:', data.error);
          setConnectionStatus('disconnected');
          alert('Failed to reset simulation.');
        }
      } else {
        console.log('❌ Unknown message type:', data.type);
      }
    };
    
    websocket.onerror = (error) => { 
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
    
    websocket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      setConnectionStatus('disconnected');
      setSimulationStarted(false);
    };
  };

  const closePopup = useCallback(() => {
    setPopupMessage("");
  }, []);

  const handleRestartSimulation = (algorithm) => {
    console.log('🔄 handleRestartSimulation called with algorithm:', algorithm);
    
    // Reset states
    setSimulationResults(null);
    setFlights([]);
    setSimTime(0);
    setSpeed(1);
    setPendingSpeed(1);
    setWeather(null);
    setCrashEvents({});
    setRunwayStatus({});
    setPendingRestart(algorithm); // Set pending restart algorithm
    pendingRestartRef.current = algorithm; // Store in ref for immediate access
    console.log('🔄 Set pendingRestart to:', algorithm);
    
    // Send reset message to backend first
    if (ws && ws.readyState === WebSocket.OPEN) {
      const resetMessage = {
        type: 'reset_simulation'
      };
      ws.send(JSON.stringify(resetMessage));
      console.log('🔄 Sent reset simulation message:', resetMessage);
      
      // The reset response will be handled by the main WebSocket message handler
    } else {
      console.log('⚠️ WebSocket not connected, starting fresh connection');
      // If WebSocket is not connected, start fresh connection
      handleStartSimulation(algorithm);
    }
  };

  const handleGoHome = () => {
    // Reset all states
    setSimulationResults(null);
    setSimulationStarted(false);
    setFlights([]);
    setSimTime(0);
    setSpeed(1);
    setPendingSpeed(1);
    setWeather(null);
    setCrashEvents({});
    setRunwayStatus({});
    setConnectionStatus('disconnected');
    
    // Close WebSocket if open
    if (ws) {
      ws.close();
      setWs(null);
    }
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

  const handleEventSubmit = (eventData) => {
    // Validate crash events before sending to backend
    if (eventData.event_type === 'TAKEOFF_CRASH' || eventData.event_type === 'LANDING_CRASH') {
      const targetFlight = flights.find(f => f.flight_id === eventData.target);
      const expectedStatus = eventData.event_type === 'TAKEOFF_CRASH' ? 'takeOff' : 'landing';
      
      if (!targetFlight || targetFlight.status !== expectedStatus) {
        // Show error message and don't send to backend
        const errorMsg = eventData.event_type === 'TAKEOFF_CRASH' 
          ? `The plane ${eventData.target} is not currently taking off!`
          : `The plane ${eventData.target} is not currently landing!`;
        setPopupMessage(errorMsg);
        console.log('❌ Invalid crash event - not sent to backend:', eventData);
        return; // Exit early, don't send to backend
      }
    }

    // Validate flight-specific events to ensure target flight exists and is in correct status
    if (eventData.event_type === 'FLIGHT_CANCEL' || eventData.event_type === 'FLIGHT_DELAY') {
      const targetFlight = flights.find(f => f.flight_id === eventData.target);
      
      if (!targetFlight) {
        // Show error message and don't send to backend
        const errorMsg = `Flight ${eventData.target} does not exist!`;
        setPopupMessage(errorMsg);
        console.log('❌ Invalid flight event - target flight not found:', eventData);
        return; // Exit early, don't send to backend
      }
      
      // These events only work on dormant flights
      if (targetFlight.status !== 'dormant') {
        const errorMsg = `Flight ${eventData.target} is not dormant (current status: ${targetFlight.status}). ${eventData.event_type} can only be applied to dormant flights.`;
        setPopupMessage(errorMsg);
        console.log('❌ Invalid flight event - flight not dormant:', eventData);
        return; // Exit early, don't send to backend
      }
    }

    // GO_AROUND only works on waiting flights
    if (eventData.event_type === 'GO_AROUND') {
      const targetFlight = flights.find(f => f.flight_id === eventData.target);
      
      if (!targetFlight) {
        // Show error message and don't send to backend
        const errorMsg = `Flight ${eventData.target} does not exist!`;
        setPopupMessage(errorMsg);
        console.log('❌ Invalid flight event - target flight not found:', eventData);
        return; // Exit early, don't send to backend
      }
      
      // GO_AROUND only works on waiting flights
      if (targetFlight.status !== 'waiting') {
        const errorMsg = `Flight ${eventData.target} is not waiting (current status: ${targetFlight.status}). GO_AROUND can only be applied to waiting flights.`;
        setPopupMessage(errorMsg);
        console.log('❌ Invalid flight event - flight not waiting:', eventData);
        return; // Exit early, don't send to backend
      }
    }

    // EMERGENCY_LANDING creates new flights, so no validation needed
    // (The backend will handle creating the new flight)

    // Validate runway events to ensure target runway is valid
    if (eventData.event_type === 'RUNWAY_CLOSURE') {
      const validRunways = ['14L', '14R', '32L', '32R'];
      if (!validRunways.includes(eventData.target)) {
        // Show error message and don't send to backend
        const errorMsg = `Invalid runway: ${eventData.target}. Valid runways are: ${validRunways.join(', ')}`;
        setPopupMessage(errorMsg);
        console.log('❌ Invalid runway event - invalid runway:', eventData);
        return; // Exit early, don't send to backend
      }
    }

    // If validation passes, send to backend
    const eventMessage = {
      type: "event",
      time: Date.now(),
      event: eventData
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(eventMessage));
      console.log('✅ Event sent to backend:', eventMessage);
    } else {
      console.error('❌ WebSocket not connected - event not sent');
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

  // Show results page if simulation results are available
  if (simulationResults) {
    console.log('🎯 Rendering ResultsPage with results:', simulationResults);
    return (
      <ResultsPage 
        results={simulationResults}
        onStartNewSimulation={handleRestartSimulation}
        onGoHome={handleGoHome}
      />
    );
  }

  // Show home page if simulation hasn't started
  if (!simulationStarted) {
    console.log('🏠 Rendering HomePage - simulation not started');
    return <HomePage onStartSimulation={handleStartSimulation} />;
  }

  console.log('🛩️ Rendering main simulation view');
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
      <WeatherAnimation weather={weather} />
      {popupMessage && (
        <EventPopup message={popupMessage} onClose={closePopup} />
      )}
    </div>
  );
}

export default App;