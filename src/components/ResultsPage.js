import React, { useState } from 'react';
import './ResultsPage.css';

const ResultsPage = ({ results, onStartNewSimulation, onGoHome }) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('greedy');
  const [isStarting, setIsStarting] = useState(false);

  const handleStartNewSimulation = () => {
    setIsStarting(true);
    onStartNewSimulation(selectedAlgorithm);
  };

  const handleGoHome = () => {
    onGoHome();
  };

  if (!results) {
    return (
      <div className="results-page">
        <div className="results-container">
          <h2>Loading Results...</h2>
        </div>
      </div>
    );
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr;
  };

  const formatScore = (score) => {
    return score ? score.toFixed(1) : 'N/A';
  };

  const formatNumber = (num) => {
    return num ? num.toFixed(1) : 'N/A';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getAlgorithmDisplayName = (algorithm) => {
    switch (algorithm) {
      case 'greedy': return 'Greedy';
      case 'advanced': return 'Advanced (MILP)';
      case 'rl': return 'Reinforcement Learning';
      default: return algorithm;
    }
  };

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="results-header">
          <h1>Simulation Results</h1>
          <p className="results-subtitle">Air Traffic Control Performance Analysis</p>
        </div>

        <div className="results-grid">
          {/* Main Scores */}
          <div className="score-section main-scores">
            <h2>Performance Scores</h2>
            <div className="score-cards">
              <div className="score-card total-score">
                <h3>Total Score</h3>
                <div 
                  className="score-value" 
                  style={{ color: getScoreColor(results.total_score) }}
                >
                  {formatScore(results.total_score)}/100
                </div>
                <p>Overall Performance</p>
              </div>
              
              <div className="score-card delay-score">
                <h3>Delay Score</h3>
                <div 
                  className="score-value" 
                  style={{ color: getScoreColor(results.delay_score) }}
                >
                  {formatScore(results.delay_score)}/100
                </div>
                <p>Efficiency</p>
              </div>
              
              <div className="score-card safety-score">
                <h3>Safety Score</h3>
                <div 
                  className="score-value" 
                  style={{ color: getScoreColor(results.safety_score) }}
                >
                  {formatScore(results.safety_score)}/100
                </div>
                <p>Safety Performance</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="stats-section">
            <h2>Flight Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Flights:</span>
                <span className="stat-value">{results.total_flights || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cancelled Flights:</span>
                <span className="stat-value">{results.cancelled_flights || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Delay Time:</span>
                <span className="stat-value">{formatNumber(results.total_delay_time_weighted)} min</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Average Delay:</span>
                <span className="stat-value">
                  {results.total_flights > 0 
                    ? formatNumber(results.total_delay_time_weighted / results.total_flights) 
                    : '0.0'} min
                </span>
              </div>
            </div>
          </div>

          {/* Safety Breakdown */}
          {results.safety_breakdown && (
            <div className="safety-section">
              <h2>Safety Analysis</h2>
              <div className="safety-breakdown">
                {Object.entries(results.safety_breakdown).map(([key, value]) => (
                  value > 0 && (
                    <div key={key} className="safety-item">
                      <span className="safety-label">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </span>
                      <span className="safety-value">{formatNumber(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Simulation Info */}
          <div className="simulation-info">
            <h2>Simulation Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">End Time:</span>
                <span className="info-value">{formatTime(results.time)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Delay Loss:</span>
                <span className="info-value">{formatNumber(results.total_delay_loss)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Safety Loss:</span>
                <span className="info-value">{formatNumber(results.total_safety_loss)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-section">
          <div className="algorithm-selector">
            <label htmlFor="algorithm-select">Choose Algorithm for Next Simulation:</label>
            <select 
              id="algorithm-select"
              value={selectedAlgorithm} 
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
            >
              <option value="greedy">Greedy</option>
              <option value="advanced">Advanced (MILP)</option>
              <option value="rl">Reinforcement Learning</option>
            </select>
          </div>
          
          <div className="action-buttons">
            <button 
              className="btn btn-primary start-btn"
              onClick={handleStartNewSimulation}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <span className="spinner"></span>
                  Starting...
                </>
              ) : (
                `Start New Simulation (${getAlgorithmDisplayName(selectedAlgorithm)})`
              )}
            </button>
            
            <button 
              className="btn btn-secondary home-btn"
              onClick={handleGoHome}
              disabled={isStarting}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage; 