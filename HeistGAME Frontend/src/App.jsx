import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from './contexts/GameContext';
import './App.css';

import HomePage from './components/HomePage';
import Lobby from './components/Lobby';
import GamePage from './components/GamePage';
import {GameOver} from './components/GameOver';
import PublicLobby from './components/PublicLobby';
import SettingsButton from './components/SettingsButton';
import SettingsModal from './components/SettingsModal';

const AppContent = () => {
  const [localError, setLocalError] = useState('');
  const [page, setPage] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  
  const game = useContext(GameContext);
  
  const { 
    gameState, 
    error: gameError, 
    loading, 
    playerName, 
    setPlayerName,
    playerId,
    publicGames,
    fetchPublicGames,
    createGame, 
    joinGameById, 
    startGame,
    resetGame,
    leaveGame,
    kickPlayer,
    setReady
  } = game;

  useEffect(() => {
    if (gameError) setLocalError(gameError);
  }, [gameError]);
  
  useEffect(() => {
    if (localError) {
      const timer = setTimeout(() => setLocalError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [localError]);

  // This effect automatically navigates the user based on the game state
  useEffect(() => {
    if (gameState?.status === 'LOBBY') {
      setPage('lobby');
    } else if (gameState?.status === 'IN_PROGRESS') {
      setPage('game');
    } else if (gameState?.status === 'FINISHED') {
      setPage('game_over');
    } else if (!gameState) {
      // If gameState is ever null, it means we're not in a game.
      setPage('home');
    }
  }, [gameState]);
  
  // This function handles the logic for showing the public lobby.
  const handleShowPublicGames = async () => {
    await fetchPublicGames(); // First, fetch the list of games.
    setPage('public_lobby');  // Then, navigate to the public lobby page.
  };


  if (loading) {
    return <div className="loading-screen">Connecting...</div>;
  }

  const renderPage = () => {
    switch (page) {
      case 'public_lobby':
        return <PublicLobby 
                  publicGames={publicGames}
                  fetchPublicGames={fetchPublicGames}
                  joinGameById={joinGameById}
                  createGame={createGame}
                  setPage={setPage}
                  setLocalError={setLocalError}
                  playerName={playerName}
                />;
      case 'lobby':
        if (!gameState) return null;
        return <Lobby gameState={gameState} playerId={playerId} startGame={startGame} leaveGame={leaveGame} kickPlayer={kickPlayer} setReady={setReady} setLocalError={setLocalError} />;
      case 'game':
        // GamePage has its own internal guard, so this is fine.
        return <GamePage />;
      case 'game_over':
        // Add a guard to prevent rendering with a null gameState, which causes a crash.
        if (!gameState) return null;
        return <GameOver gameState={gameState} playerId={playerId} resetGame={resetGame} />;
      case 'home':
      default:
        return (
          <HomePage
            createGame={createGame}
            joinGameById={joinGameById}
            playerName={playerName}
            setPlayerName={setPlayerName}
            setLocalError={setLocalError}
            // Pass the new handler function to the HomePage component
            onShowPublicGames={handleShowPublicGames} 
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Only show the global settings button on the homepage */}
      {page === 'home' && (
        <div className="ui-bottom-left">
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
      )}
      {page === 'home' && showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div className="main-content">
        {localError && (
          <div className="error-message">{localError}</div>
        )}
        {renderPage()}
      </div>
    </div>
  );
};

const App = () => (
    <AppContent />
);

export default App;
