import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppProvider } from './AppContext';
import AppRouter from './router';

function App() {
  return (
    <Router>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </Router>
  );
}

export default App;
