import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("/api")
      .then((res) => res.json())
      .then((data) => setMessage(data.status))
      .catch(() => setMessage("Error connecting to backend"));
  }, []);

  return (
    <div className="App">
      <h1>v2v Full-Stack Boilerplate</h1>
      <p>Backend says: {message}</p>
    </div>
  );
}

export default App; 