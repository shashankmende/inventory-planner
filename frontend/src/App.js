import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppProvider } from './app/AppContext';
import AppRouter from './app/router';

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </Router>
  );
}
