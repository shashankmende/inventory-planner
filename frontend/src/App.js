import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function Home() {
  const [apiStatus, setApiStatus] = React.useState('');
  React.useEffect(() => {
    // fetch('http://localhost:4000/health')
    fetch('https://inventory-planner-api.onrender.com/health')
      .then(res => res.json())
      .then(data => setApiStatus(data.status))
      .catch(() => setApiStatus('API not reachable'));
  }, []);
  return (
    <div>
      <h1>Inventory Planner</h1>
      <p>Backend status: {apiStatus}</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
