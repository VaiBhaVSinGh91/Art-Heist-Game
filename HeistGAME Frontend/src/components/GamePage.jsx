import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import GameActions from './GameActions';
import GameCanvas from './GameCanvas';
// NEW: Import the UI overlay we will create next
import GameUIOverlay from './GameUIOverlay';

const GamePage = () => {
  // Get all game data and actions from the context instead of props.
  const { gameState, playerId, ...actions } = useContext(GameContext);

  // Add a guard clause to prevent rendering if gameState is not yet available.
  if (!gameState) {
    return null; // Or a loading spinner
  }

  const playersInOrder = (gameState.playerOrder && gameState.players)
    ? gameState.playerOrder
        .map(pId => gameState.players[pId])
        .filter(Boolean)
    : [];

  return (
    // The game-page container will now act as a positioning context for our overlays
    <div className="game-page">
      <GameCanvas 
        players={playersInOrder}
        mastermindId={gameState.mastermindId}
      />
      
      {/* NEW: Add the UI Overlay for buttons and info modals */}
      <GameUIOverlay gameState={gameState} />

      {/* This component already provides the pop-ups for game actions */}
      <GameActions 
        gameState={gameState}
        playerId={playerId}
        proposeTeam={actions.proposeTeam}
        submitVote={actions.submitVote}
        playMissionCard={actions.playMissionCard}
      />
    </div>
  );
};

export default GamePage;