import React, { useState } from "react";
import InfoBoard from "./InfoBoard";

export default function TestInfoBoard() {
  const [testFlights, setTestFlights] = useState([
    {
      flight_id: "KE123",
      status: "boarding",
      progress: 25,
      ETA: "14:30",
      ETD: "15:00",
      depAirport: "CDG",
      arrivalAirport: "GMP",
      airline: "Korean Air",
      location: "Gate A1"
    },
    {
      flight_id: "OZ456",
      status: "delayed",
      progress: 0,
      ETA: "16:45",
      ETD: null,
      depAirport: "NRT",
      arrivalAirport: "GMP",
      airline: "Asiana Airlines",
      location: "Gate B3"
    }
  ]);

  const addTestFlight = () => {
    const newFlight = {
      flight_id: `TEST${Math.floor(Math.random() * 1000)}`,
      status: ["boarding", "delayed", "taxiing", "landing"][Math.floor(Math.random() * 4)],
      progress: Math.floor(Math.random() * 100),
      ETA: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      ETD: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      depAirport: ["CDG", "NRT", "ICN", "LAX"][Math.floor(Math.random() * 4)],
      arrivalAirport: "GMP",
      airline: ["Korean Air", "Asiana Airlines", "Jeju Air", "T'way Air"][Math.floor(Math.random() * 4)],
      location: "Gate A1"
    };
    setTestFlights([...testFlights, newFlight]);
  };

  const clearFlights = () => {
    setTestFlights([]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>InfoBoard Test</h1>
      <button onClick={addTestFlight}>Add Random Flight</button>
      <button onClick={clearFlights}>Clear All Flights</button>
      <InfoBoard flights={testFlights} />
    </div>
  );
}