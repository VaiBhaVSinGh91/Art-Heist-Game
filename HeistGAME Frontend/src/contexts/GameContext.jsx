import React, { createContext } from 'react';
import { useGame } from '../hooks/useGame';
import { useSound } from '../hooks/useSound'; // Import the new hook

// Create the context, which components will use to access the game state.
export const GameContext = createContext(null);

// Create the provider component. This is the component that will wrap our entire app.
// It is responsible for creating the game state and making it available to all
// components inside it.
export const GameProvider = ({ children }) => {
  // The useGame hook is called ONCE here. This is the single source of truth.
  const game = useGame();
  
  // Call the sound hook here; it will listen to game state changes and play sounds.
  useSound(game.gameState, game.playerId);

  return (
    // The 'value' prop is where we make the game state and functions available.
    <GameContext.Provider value={game}>
      {children}
    </GameContext.Provider>
  );
};
