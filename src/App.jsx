import React, { useEffect, useState } from 'react'
import "./App.css"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NoPage from './pages/NoPage';

const App = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('aedify-theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('aedify-theme', theme)
  }, [theme])

  return (
    <div className="app-shell">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Home theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />}
          />
          <Route path="*" element={<NoPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App