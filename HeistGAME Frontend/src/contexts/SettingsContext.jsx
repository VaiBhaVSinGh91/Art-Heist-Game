import React, { createContext, useState, useEffect, useContext } from 'react';

const defaultSettings = {
  volume: 0.5,
};

// Helper to get settings from localStorage
const getInitialSettings = () => {
  try {
    const item = window.localStorage.getItem('heistGameSettings');
    return item ? JSON.parse(item) : defaultSettings;
  } catch (error) {
    console.warn('Error reading settings from localStorage', error);
    return defaultSettings;
  }
};

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getInitialSettings);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem('heistGameSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Error saving settings to localStorage', error);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};