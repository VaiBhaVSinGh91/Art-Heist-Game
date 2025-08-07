import React, { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';

const SettingsModal = ({ onClose }) => {
  const { settings, setSettings } = useContext(SettingsContext);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSettings(prev => ({ ...prev, volume: newVolume }));
  };

  return (
    <div className="modal-backdrop-light">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h2 className="modal-title">SETTINGS</h2>
        <div className="settings-section">
          <label htmlFor="volume-slider">Volume</label>
          <div className="volume-control">
            <span>🔊</span>
            <input
              type="range"
              id="volume-slider"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={handleVolumeChange}
            />
          </div>
        </div>
        <button className="btn btn-red" onClick={onClose} style={{ marginTop: '20px' }}>
          Close
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;