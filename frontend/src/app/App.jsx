import { RouterProvider } from 'react-router';
import { router } from './app.route.jsx';
import { useAuth } from '../features/auth/hook/useAuth.js';
import { useEffect } from 'react';

import './App.css';

function App() {
  const { handleGetMe } = useAuth()

  useEffect(() => {
    // If Google OAuth redirected back with ?token=, save it to localStorage
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Clean the token from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    handleGetMe()
  }, [])

  return (
    <RouterProvider router={router} />
  );
}

export default App;

