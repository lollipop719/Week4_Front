import React, { useState } from "react";
import "./EventPanel.css";

export default function EventPanel({ onSubmit }) {
  const [formData, setFormData] = useState({
    eventType: 'EMERGENCY_LANDING',
    targetType: 'Flight',
    target: '',
    duration: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      event_type: formData.eventType,
      targetType: formData.targetType,
      target: formData.target,
      duration: parseInt(formData.duration)
    });
    
    // Reset form
    setFormData({
      eventType: 'EMERGENCY_LANDING',
      targetType: 'Flight',
      target: '',
      duration: ''
    });
  };

  const handleEventTypeChange = (e) => {
    const selectedEventType = e.target.value;
    let newTargetType = 'Flight'; // Default
    
    // Set targetType based on event type
    if (selectedEventType === 'RUNWAY_CLOSURE' || selectedEventType === 'RUNWAY_INVERT') {
      newTargetType = 'Runway';
    } else {
      newTargetType = 'Flight';
    }

    setFormData({
      ...formData,
      eventType: selectedEventType,
      targetType: newTargetType,
      target: '' // Reset target when event type changes
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Check if we should show runway dropdown
  const isRunwayEvent = formData.eventType === 'RUNWAY_CLOSURE' || formData.eventType === 'RUNWAY_INVERT';

  return (
    <div className="trigger-event">
      <h2>⚡ Trigger Event</h2>
      <form onSubmit={handleSubmit}>
        <select 
          name="eventType" 
          value={formData.eventType}
          onChange={handleEventTypeChange}
          required
        >
          <option value="EMERGENCY_LANDING">EMERGENCY_LANDING</option>
          <option value="RUNWAY_CLOSURE">RUNWAY_CLOSURE</option>
          <option value="FLIGHT_CANCEL">FLIGHT_CANCEL</option>
          <option value="FLIGHT_DELAY">FLIGHT_DELAY</option>
          <option value="GO_AROUND">GO_AROUND</option>
          <option value="TAKEOFF_CRASH">TAKEOFF_CRASH</option>
          <option value="LANDING_CRASH">LANDING_CRASH</option>
          <option value="RUNWAY_INVERT">RUNWAY_INVERT</option>
        </select>
        
        <select 
          name="targetType" 
          value={formData.targetType}
          onChange={handleChange}
          required
        >
          <option value="Flight">Flight</option>
          <option value="Runway">Runway</option>
        </select>
        
        {isRunwayEvent ? (
          <select 
            name="target" 
            value={formData.target}
            onChange={handleChange}
            required
          >
            <option value="">Select Runway</option>
            <option value="14L">14L</option>
            <option value="14R">14R</option>
            <option value="32L">32L</option>
            <option value="32R">32R</option>
          </select>
        ) : (
          <input 
            name="target" 
            placeholder="Target e.g., LJ517" 
            value={formData.target}
            onChange={handleChange}
            required 
          />
        )}
        
        <input 
          name="duration" 
          placeholder="Duration (minutes)" 
          type="number" 
          value={formData.duration}
          onChange={handleChange}
          required 
        />
        
        <button type="submit">Send</button>
      </form>
    </div>
  );
}