import { useEffect, useState } from 'react';

export default function useWebSocket(url) {
  const [flights, setFlights] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => console.log('Connected');
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      console.log(data)
      if (data.type === "state_update") {
        setFlights(data.flights);
      }
    };
    return () => ws.close();
  }, [url]);

  return { flights };
}