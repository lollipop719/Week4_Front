import React from "react";
import "./InfoBoard.css";
import SpeedControl from "./SpeedControl";

export default function InfoBoard({ flights, simTime, speed, onSpeedChange }) {
  // Convert simTime (seconds) to HH:MM:SS format
  const formatSimTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flight-board">
      
      <h3>✈️ Arrivals & Departures</h3>
      <div className="sim-time">
        <h4>🕐 Simulation Time: {formatSimTime(simTime)}</h4>
      </div>
      <div className="speed-control-section">
        <SpeedControl speed={speed} onSpeedChange={onSpeedChange} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Flight</th><th>ETA</th><th>ETD</th><th>Dep</th><th>Arr</th><th>Airline</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {flights.map(f => (
            <tr key={f.flight_id}>
              <td>{f.flight_id}</td>
              <td>{f.ETA}</td>
              <td>{f.ETD}</td>
              <td>{f.depAirport}</td>
              <td>{f.arrivalAirport}</td>
              <td>{f.airline}</td>
              <td className={`status-${f.status}`}>{f.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}