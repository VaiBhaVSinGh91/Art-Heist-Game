import React, { useState } from 'react';
import HowToPlayModal from './HowToPlayModal';

const HomePage = ({ 
  createGame, 
  joinGameById, 
  playerName, 
  setPlayerName, 
  setLocalError, 
  onShowPublicGames // This is the correct prop to use
}) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const handleAction = (action) => {
    if (!playerName) {
      setLocalError('Please enter a display name first.');
      return;
    }
    action();
  };

  const handleJoin = () => {
    if (!joinCode) {
      setLocalError('Please enter a game code.');
      return;
    }
    handleAction(() => joinGameById(joinCode));
  };




  return (
    <div className="homepage">
      <h1 className="homepage-title">ART HEIST</h1>
      <p className="homepage-tagline">Trust is the greatest prize.</p>

      <div className="homepage-input-container">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="ENTER DISPLAY NAME"
          className="homepage-input"
          maxLength="12"
        />
      </div>

      <div className="homepage-buttons">
        {/* FIX: The onClick handler now calls the correct 'onShowPublicGames' function */}
        <button className="btn btn-blue" onClick={() => handleAction(onShowPublicGames)}>
          Public Game
        </button>
        <button className="btn btn-green" onClick={() => handleAction(() => createGame(false))}>
          Create Private Game
        </button>
        <button className="btn" onClick={() => setShowHowToPlay(true)} style={{backgroundColor: '#4a4a50'}}>
          How to Play
        </button>
      </div>

      <div className="join-game-container">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="GAME CODE"
          className="join-game-input"
          maxLength="8"
        />
        <button className="join-game-button" onClick={handleJoin}>
          Join
        </button>
      </div>

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
};



export default HomePage;
