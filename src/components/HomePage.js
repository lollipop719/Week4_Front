import React, { useState } from "react";
import "./HomePage.css";

export default function HomePage({ onStartSimulation }) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("greedy");
  const [isConnecting, setIsConnecting] = useState(false);

  const algorithms = [
    { value: "greedy", label: "Greedy Algorithm", description: "Simple and fast scheduling approach" },
    { value: "advanced", label: "Advanced Algorithm", description: "Sophisticated optimization with MILP" }
  ];

  const handleStart = () => {
    setIsConnecting(true);
    onStartSimulation(selectedAlgorithm);
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="hero-section">
          <div className="logo">
            <div className="logo-icon">✈️</div>
            <h1>Air Traffic Control</h1>
            <p>Advanced Airport Management Simulation</p>
          </div>
        </div>

        <div className="content-section">
          <div className="welcome-card">
            <h2>Welcome to the Simulation</h2>
            <p>
              Experience real-time air traffic control with advanced scheduling algorithms. 
              Monitor flights, manage runways, and handle dynamic events in a realistic airport environment.
            </p>
          </div>

          <div className="algorithm-selection">
            <h3>Select Scheduling Algorithm</h3>
            <div className="algorithm-options">
              {algorithms.map((algorithm) => (
                <div
                  key={algorithm.value}
                  className={`algorithm-option ${selectedAlgorithm === algorithm.value ? 'selected' : ''}`}
                  onClick={() => setSelectedAlgorithm(algorithm.value)}
                >
                  <div className="algorithm-header">
                    <input
                      type="radio"
                      name="algorithm"
                      value={algorithm.value}
                      checked={selectedAlgorithm === algorithm.value}
                      onChange={() => setSelectedAlgorithm(algorithm.value)}
                    />
                    <label>{algorithm.label}</label>
                  </div>
                  <p className="algorithm-description">{algorithm.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="features-section">
            <h3>Simulation Features</h3>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🛫</div>
                <h4>Takeoff Management</h4>
                <p>Optimize departure sequences and runway assignments</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🛬</div>
                <h4>Landing Coordination</h4>
                <p>Efficient arrival scheduling and safety separation</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🌤️</div>
                <h4>Weather Integration</h4>
                <p>Real-time weather impact on operations</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <h4>Dynamic Events</h4>
                <p>Handle runway closures, emergencies, and delays</p>
              </div>
            </div>
          </div>

          <div className="start-section">
            <button
              className={`start-button ${isConnecting ? 'connecting' : ''}`}
              onClick={handleStart}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                <>
                  🚀 Start Simulation
                </>
              )}
            </button>
            {isConnecting && (
              <p className="connecting-text">
                Connecting to simulation server...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 