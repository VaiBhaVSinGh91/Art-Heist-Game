import { useEffect, useRef, useContext } from 'react';
import playSound, { sounds } from '../services/sound';
import { SettingsContext } from '../contexts/SettingsContext';

export const useSound = (gameState, playerId) => {
  const prevGameStateRef = useRef(null);
  const { settings } = useContext(SettingsContext);

  useEffect(() => {
    const prevState = prevGameStateRef.current;
    const currState = gameState;

    // Don't play sounds on initial load or if state is null
    if (!prevState || !currState) {
      prevGameStateRef.current = currState;
      return;
    }

    // --- Lobby & Game State Sounds ---
    // Player joins
    if (Object.keys(currState.players).length > Object.keys(prevState.players).length) {
      playSound(sounds.PLAYER_JOIN, settings.volume);
    }
    // Player leaves (goes offline)
    const currOnline = Object.values(currState.players).filter(p => p.isOnline).length;
    const prevOnline = Object.values(prevState.players).filter(p => p.isOnline).length;
    if (currOnline < prevOnline) {
        playSound(sounds.PLAYER_LEAVE, settings.volume);
    }
    // Game starts
    if (currState.status === 'IN_PROGRESS' && prevState.status === 'LOBBY') {
      playSound(sounds.GAME_START, settings.volume);
    }

    // --- Round Progression Sounds ---
    // New Mastermind
    if (currState.mastermindId !== prevState.mastermindId) {
      playSound(sounds.NEW_MASTERMIND, settings.volume);
    }
    // Team is proposed
    if (currState.phase === 'TEAM_VOTE' && prevState.phase === 'TEAM_SELECTION') {
      playSound(sounds.TEAM_PROPOSED, settings.volume);
    }

    // --- Vote Reveal Sounds ---
    if (currState.phase === 'VOTE_REVEAL' && prevState.phase === 'TEAM_VOTE') {
      const approveVotes = Object.values(currState.votes).filter(v => v === 'APPROVE').length;
      const rejectVotes = Object.keys(currState.players).length - approveVotes;
      playSound(approveVotes > rejectVotes ? sounds.VOTE_PASSED : sounds.VOTE_FAILED, settings.volume);
    }

    // --- Game Over Sounds ---
    // This is checked BEFORE the mission reveal sound to ensure it takes priority.
    if (currState.status === 'FINISHED' && prevState.status !== 'FINISHED' && currState.winner) {
      const me = currState.players[playerId];
      // Check if the local player's role (e.g., THIEF) matches the winner (e.g., THIEVES)
      if (me && currState.winner.startsWith(me.role)) {
        playSound(sounds.GAME_WIN, settings.volume);
      } else {
        playSound(sounds.GAME_LOSE, settings.volume);
      }
    }
    // --- Mission Reveal Sounds ---
    // This 'else if' prevents this sound from playing on the game-ending mission.
    else if (currState.missionHistory.length > prevState.missionHistory.length) {
      const lastMission = currState.missionHistory[currState.missionHistory.length - 1];
      playSound(lastMission.result === 'SUCCESS' ? sounds.MISSION_SUCCESS : sounds.MISSION_FAILURE, settings.volume);
    }

    // Update the ref for the next render
    prevGameStateRef.current = currState;
  }, [gameState, playerId, settings.volume]);
};