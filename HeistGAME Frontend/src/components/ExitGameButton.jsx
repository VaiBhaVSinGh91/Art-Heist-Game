import React from 'react';

const ExitGameButton = ({ onExit }) => {
  const handleClick = () => {
    if (window.confirm("Are you sure you want to leave the game? This action cannot be undone.")) {
      onExit();
    }
  };

  return (
    <button 
      className="ui-button" 
      onClick={handleClick} 
      style={{ backgroundColor: '#5a2a2a', borderColor: '#ef4444', color: '#ef4444' }}
    >
      Exit Game
    </button>
  );
};

export default ExitGameButton;