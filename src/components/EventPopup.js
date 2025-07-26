import React, { useEffect } from "react";
import "./EventPopup.css";

export default function EventPopup({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="event-popup">
      <div className="event-popup-content">
        {message}
      </div>
    </div>
  );
} 