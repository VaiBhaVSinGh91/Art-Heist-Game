import React from 'react';

const SettingsButton = ({ onClick }) => {
  return (
    <button onClick={onClick} className="settings-button" title="Settings">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19.46 11.54l-1.34-.77a8.6 8.6 0 000-1.54l1.34-.77c.4-.23.64-.68.55-1.15l-1-1.73c-.09-.47-.45-.83-.92-.92l-1.73-1c-.47-.09-1.01.16-1.24.55l-.77 1.34a8.6 8.6 0 00-1.54 0l-.77-1.34a1.25 1.25 0 00-1.24-.55l-1.73 1c-.47.09-.83.45-.92.92l-1 1.73c-.09.47.16 1.01.55 1.24l1.34.77a8.6 8.6 0 000 1.54l-1.34.77a1.25 1.25 0 00-.55 1.24l1 1.73c.09.47.45.83.92.92l1.73 1c.47.09 1.01-.16 1.24-.55l.77-1.34a8.6 8.6 0 001.54 0l.77 1.34c.23.4.68.64 1.15.55l1.73-1c.47-.09.83-.45.92-.92l1-1.73c.09-.47-.16-1.01-.55-1.24zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
      </svg>
    </button>
  );
};

export default SettingsButton;