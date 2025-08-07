import React from 'react';

const PublicLobby = ({ 
  publicGames, 
  joinGameById, 
  createGame, 
  setPage, 
  setLocalError,
  playerName
}) => {
  // FIX: The useEffect that caused the infinite loop has been removed.

  const handleJoin = (gameId) => {
    if (!playerName) {
      setLocalError("Please enter a display name before joining.");
      setPage('home'); // Go back to home to enter name
      return;
    }
    joinGameById(gameId);
  };
  
  const handleCreate = () => {
    if (!playerName) {
      setLocalError("Please enter a display name before creating a game.");
      setPage('home'); // Go back to home to enter name
      return;
    }
    createGame(true); // true for a public game
  };

  return (
    <div className="lobby">
      <h2 className="lobby-title">PUBLIC GAMES</h2>
      <div className="player-list-container" style={{ maxHeight: '40vh', overflowY: 'auto', padding: '1rem' }}>
        {publicGames.length > 0 ? (
          publicGames.map(game => (
            <div key={game.gameId} className="lobby-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#333', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
              <div>
                <p className="lobby-item-host" style={{margin: 0, fontSize: '1.5rem'}}>{game.hostName}'s Game</p>
                <p className="lobby-item-players" style={{margin: 0, color: '#aaa'}}>{game.playerCount} / 8 Players</p>
              </div>
              <button className="join-game-button" onClick={() => handleJoin(game.gameId)}>Join</button>
            </div>
          ))
        ) : (
          <p>No public games found. Why not create one?</p>
        )}
      </div>
      <div className="lobby-actions">
        <button className="btn btn-green" onClick={handleCreate}>Create Public Game</button>
        <button className="btn" onClick={() => setPage('home')} style={{backgroundColor: 'gray', marginTop: '1rem'}}>Back</button>
      </div>
    </div>
  );
};

export default PublicLobby;
