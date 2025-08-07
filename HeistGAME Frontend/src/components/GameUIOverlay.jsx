// In GameUIOverlay.jsx

import React, { useState, useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import MissionTrack from './MissionTrack';
import VoteTrack from './VoteTrack';
import LogAndChat from './LogAndChat';
import ExitGameButton from './ExitGameButton';
import SettingsButton from './SettingsButton';
import SettingsModal from './SettingsModal';

// REFACTORED: The modal is now just the content box, not the backdrop.
const InfoModalContent = ({ title, children, onClose }) => (
    <div className="modal-content">
      <h3 className="modal-title">{title}</h3>
      <div className="modal-scrollable-content">
        {children}
      </div>
      <button className="btn btn-red" onClick={onClose} style={{marginTop: '20px'}}>Close</button>
    </div>
);


const GameUIOverlay = ({ gameState }) => {
  const [showMissions, setShowMissions] = useState(false);
  const [showVoteTrack, setShowVoteTrack] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { leaveGame } = useContext(GameContext);

  const playerCount = Object.keys(gameState.players).length;

  return (
    <>
      {/* Top Bar */}
      <div className="game-ui-bar top">
        <div className="ui-top-left">
          <ExitGameButton onExit={leaveGame} />
        </div>
        <div className="ui-top-right">
          <button className="ui-button" onClick={() => setShowMissions(true)}>Missions</button>
          <button className="ui-button" onClick={() => setShowVoteTrack(true)}>Vote Track</button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="game-ui-bar bottom">
        <div className="ui-bottom-left">
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
        <div className="ui-bottom-right">
          <button className="ui-button" onClick={() => setShowLog(true)}>Chat & Log</button>
        </div>
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {showMissions && (
        <div className="modal-backdrop-light">
          <InfoModalContent title="MISSION HISTORY" onClose={() => setShowMissions(false)}>
            <MissionTrack 
              missionHistory={gameState.missionHistory}
              playerCount={playerCount}
            />
          </InfoModalContent>
        </div>
      )}

      {showVoteTrack && (
        <div className="modal-backdrop-light">
          <InfoModalContent title="VOTE TRACK" onClose={() => setShowVoteTrack(false)}>
            <VoteTrack voteTrack={gameState.roundNumber - 1} />
          </InfoModalContent>
        </div>
      )}

      {showLog && (
        // Use a different backdrop class for the log modal
        <div className="modal-backdrop-log">
          <InfoModalContent title="CHAT & LOG" onClose={() => setShowLog(false)}>
            <LogAndChat />
          </InfoModalContent>
        </div>
      )}
    </>
  );
};

export default GameUIOverlay;