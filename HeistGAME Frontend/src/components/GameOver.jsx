import React, { useState } from 'react';

export function GameOver({ gameState, playerId, resetGame }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlayAgain = async () => {
    setIsLoading(true);
    setError('');
    // The resetGame function from props now handles the API call.
    // The game state will change to LOBBY, which will unmount this component.
    try {
      resetGame();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const isHost = playerId === gameState.hostId;
  const { winner, players } = gameState;

  // Handle the case where the game was aborted (no winner assigned)
  if (!winner) {
    return (
      <div className="game-over">
        <h2>Game Aborted</h2>
        <p>The game was terminated because the host left or there were not enough players.</p>
        <p style={{ fontStyle: 'italic', marginTop: '2rem' }}>
          Returning to the homepage...
        </p>
      </div>
    );
  }

  const winnerClass = winner === 'THIEVES' ? 'thieves-win' : 'agents-win';

  return (
    <div className={`game-over ${winnerClass}`}>
      <h2>Game Over</h2>
      <h1 className="winner-title">{winner} WIN</h1>
      <h3>Role Reveal:</h3>
      <ul className="role-reveal-list">
        {Object.values(players).map(p => (
          <li key={p.uid} className={`${p.role === 'AGENT' ? 'agent-role' : 'thief-role'} ${!p.isOnline ? 'offline' : ''}`}>
            <span className="player-name">{p.displayName} {!p.isOnline && '(Left Game)'}</span>
            <span className="player-role">{p.role}</span>
          </li>
        ))}
      </ul>
      {isHost && (
        <button onClick={handlePlayAgain} disabled={isLoading} className="btn btn-green">{isLoading ? 'Resetting...' : 'Play Again'}</button>
      )}
      {!isHost && <p>Waiting for the host to start a new game...</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
