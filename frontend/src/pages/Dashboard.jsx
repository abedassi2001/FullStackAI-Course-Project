// src/pages/Dashboard.jsx
import { useState } from "react";

export default function Dashboard() {
  const [message, setMessage] = useState("Hello world");

  return (
    <div>
      <h1>Dashboard</h1>
      <p>{message}</p>
    </div>
  );
}
