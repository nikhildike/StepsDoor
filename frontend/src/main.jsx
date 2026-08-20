/**
 * main.jsx — Vite/React DOM entry point for the StepsDoor web frontend.
 *
 * Mounts the React tree into `#root` (see `frontend/index.html`) and
 * wraps `<App />` with the providers every page depends on:
 *  - `React.StrictMode` — dev-only double-invoking of effects/renders
 *    to surface side-effect bugs early; no effect in production builds.
 *  - `BrowserRouter` — react-router-dom's history-API-based router,
 *    required for the `<Routes>`/`<Route>` tree defined in App.jsx.
 *  - `ThemeProvider` — dark/light theme context (see hooks/useTheme.jsx),
 *    placed inside the router (order doesn't matter here since it
 *    doesn't depend on routing) but outside `<App />` so every route
 *    can call `useTheme()`.
 *
 * Global styles (Tailwind base/components/utilities) are pulled in via
 * `./index.css`.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './hooks/useTheme'
import './index.css'

// Create the React 18 root on the #root DOM node and render the app tree.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Enables client-side routing for the <Routes> tree in App.jsx */}
    <BrowserRouter>
      {/* Provides theme (dark/light) context to the whole app */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
