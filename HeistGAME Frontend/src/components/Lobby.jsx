import React from 'react';
import ExitGameButton from './ExitGameButton';

const Lobby = ({ gameState, playerId, startGame, leaveGame, kickPlayer, setReady, setLocalError }) => {
  const players = Object.values(gameState.players);
  const isHost = gameState.hostId === playerId;
  const localPlayer = gameState.players[playerId];
  
  const MIN_PLAYERS = 5;
  const MAX_PLAYERS = 8;

  const onlinePlayers = players.filter(p => p.isOnline);
  const readyPlayersCount = onlinePlayers.filter(p => p.isReady).length;
  const allPlayersReady = onlinePlayers.length > 0 && readyPlayersCount === onlinePlayers.length;

  const canStart = onlinePlayers.length >= MIN_PLAYERS && allPlayersReady;

  const handleStart = () => {
    if (onlinePlayers.length < MIN_PLAYERS) {
      setLocalError(`You need at least ${MIN_PLAYERS} players to start.`);
      return;
    }
    if (!allPlayersReady) {
      setLocalError('Waiting for all players to be ready.');
      return;
    }
    startGame();
  };

  const handleKick = (playerToKickId, playerDisplayName) => {
    if (window.confirm(`Are you sure you want to kick ${playerDisplayName}?`)) {
      kickPlayer(playerToKickId);
    }
  };

  const getStartButtonText = () => {
    if (onlinePlayers.length < MIN_PLAYERS) {
      return `Need ${MIN_PLAYERS - onlinePlayers.length} more player(s)`;
    }
    if (!allPlayersReady) {
      return `Waiting for ${onlinePlayers.length - readyPlayersCount} player(s)`;
    }
    return 'Start Game';
  }

  return (
    <div className="lobby">
      <div className="ui-top-right">
        <ExitGameButton onExit={leaveGame} />
      </div>
      <h2 className="lobby-title">GAME LOBBY</h2>
      <p>Share this code with your friends:</p>
      <div className="lobby-code-display">
        {/* FIX: Use 'gameId' to match the backend model */}
        <span className="lobby-code">{gameState.gameId}</span>
      </div>

      <div className="player-list-container">
        <h3 className="player-list-title">
          PLAYERS ({players.length}/{MAX_PLAYERS})
        </h3>
        <div className="player-list">
          {players.map((p) => (
            <div key={p.uid} className={`player-card ${!p.isOnline ? 'offline' : ''}`} title={!p.isOnline ? `${p.displayName} is offline` : ''}>
              {/* FIX: Use 'displayName' to match the backend model */}
              <span>{p.displayName}</span>
              {p.isOnline && (
                <span className={`ready-indicator ${p.isReady ? 'ready' : ''}`}>{p.isReady ? '✔' : '...'}</span>
              )}
              {!p.isOnline && (
                <span className="player-card-offline-tag">(Offline)</span>
              )}
              {isHost && p.uid !== playerId && (
                <button
                  className="kick-button"
                  title={`Kick ${p.displayName}`}
                  onClick={() => handleKick(p.uid, p.displayName)}
                >
                  &times;
                </button>
              )}
              {p.uid === gameState.hostId && (
                <span className="player-card-host-tag">(HOST)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lobby-actions">
        {isHost ? (
          <button className="btn btn-green" onClick={handleStart} disabled={!canStart} title={!canStart ? getStartButtonText() : ''}>
            {getStartButtonText()}
          </button>
        ) : (
          <button className={`btn ${localPlayer.isReady ? 'btn-red' : 'btn-green'}`} onClick={setReady}>
            {localPlayer.isReady ? 'Not Ready' : 'Ready Up'}
          </button>
        )}
        {!isHost && (
           <p className="lobby-waiting-text">Waiting for host to start the game...</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;
