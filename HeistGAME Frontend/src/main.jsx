import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { GameProvider } from './contexts/GameContext.jsx'
import { SettingsProvider } from './contexts/SettingsContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  //<React.StrictMode>
    <SettingsProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </SettingsProvider>
  //</React.StrictMode>,
)