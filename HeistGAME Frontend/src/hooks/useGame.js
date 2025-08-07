import { useState, useEffect, useCallback } from "react";
import { socketService } from "../services/socket";
import { api } from "../services/api";

export const useGame = () => {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Store player name and ID in state
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
  const [playerId, setPlayerId] = useState(sessionStorage.getItem("playerId"));
  
  // New state for the public games list
  const [publicGames, setPublicGames] = useState([]);

  // Save playerName to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("playerName", playerName);
  }, [playerName]);
  
  // Save playerId to sessionStorage whenever it changes
  useEffect(() => {
    if (playerId) {
      sessionStorage.setItem("playerId", playerId);
    } else {
      sessionStorage.removeItem("playerId");
      sessionStorage.removeItem("gameId");
    }
  }, [playerId]);


  const handleGameUpdate = useCallback((newGameState) => {
    setGameState(newGameState);
    // --- NEW: Persist gameId on every update ---
    if (newGameState?.gameId) {
        sessionStorage.setItem("gameId", newGameState.gameId);
    }
  }, []);

  // --- REFACTORED: This function now accepts the data it needs directly ---
  const handleDisconnect = useCallback(() => {
    // This is called when the socket connection is lost for any reason.
    // We reset the state to return the user to the homepage.
    setGameState(null);
    setPlayerId(null);
    sessionStorage.removeItem("gameId");
    sessionStorage.removeItem("playerId");
  }, []);

  const connectToSocket = useCallback((gameId, newPlayerId) => {
    setPlayerId(newPlayerId);
    socketService.connect(gameId, newPlayerId, handleGameUpdate, handleDisconnect);
  }, [handleGameUpdate, handleDisconnect]);

  const createGame = useCallback(async (isPublic) => {
    if (!playerName) {
      setError("Please enter a display name.");
      return;
    }
    setLoading(true);
    try {
      const initialState = await api.createGame(playerName, isPublic);
      setGameState(initialState);
      // --- REFACTORED: Pass data directly ---
      connectToSocket(initialState.gameId, initialState.hostId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [playerName, connectToSocket]);

  const joinGameById = useCallback(async (gameId) => {
    if (!playerName) {
      setError("Please enter a display name.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.joinGame(gameId, playerName);
      setGameState(response.game_state);
      // --- REFACTORED: Pass data directly ---
      connectToSocket(response.game_state.gameId, response.new_player_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [playerName, connectToSocket]);


  // NEW: Function to fetch the list of public games from the backend
  const fetchPublicGames = useCallback(async () => {
    setLoading(true);
    try {
      const games = await api.getPublicGames();
      setPublicGames(games);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedGameId = sessionStorage.getItem("gameId");
    const storedPlayerId = sessionStorage.getItem("playerId");

    if (storedGameId && storedPlayerId) {
      setLoading(true);
      const reconnectToGame = async () => {
        try {
          const freshGameState = await api.getGame(storedGameId);
          if (freshGameState && freshGameState.players[storedPlayerId]) {
            setGameState(freshGameState);
            // --- REFACTORED: Pass stored data directly ---
            connectToSocket(storedGameId, storedPlayerId);
          } else {
            sessionStorage.clear();
            setPlayerId(null);
          }
        } catch (err) {
          console.error("Failed to reconnect:", err);
          sessionStorage.clear();
          setPlayerId(null);
        } finally {
          setLoading(false);
        }
      };
      reconnectToGame();
    }
  }, []); // This runs only once on initial page load

  // The rest of the actions are simple wrappers around the API calls.
  // The server will broadcast the new state automatically after these succeed.
  const startGame = useCallback(() => {
    if (gameState && playerId) api.startGame(gameState.gameId, playerId).catch(err => setError(err.message));
  }, [gameState, playerId]);
  
  

  const proposeTeam = useCallback((team) => {
    if (gameState && playerId) api.proposeTeam(gameState.gameId, playerId, team).catch(err => setError(err.message));
  }, [gameState, playerId]);

  const submitVote = useCallback((vote) => {
    // We no longer perform an optimistic update.
    // We simply send the request to the server.
    // The server's WebSocket broadcast will be the single source of truth.
    if (gameState && playerId) {
      // Return the promise so the UI can chain .finally() to it
      return api.submitVote(gameState.gameId, playerId, vote)
          .catch(err => { setError(err.message); throw err; }); // Re-throw to allow .catch in component
    }
  }, [gameState, playerId]);

  const playMissionCard = useCallback((choice) => {
    if (gameState && playerId) api.playMissionCard(gameState.gameId, playerId, choice).catch(err => setError(err.message));
  }, [gameState, playerId]);

  const resetGame = useCallback(() => {
    if (gameState && playerId) {
      api.resetGame(gameState.gameId, playerId)
        .catch(err => setError(err.message));
    }
  }, [gameState, playerId]);
  
  const leaveGame = useCallback(() => {
    if (gameState && playerId) {
      api.leaveGame(gameState.gameId, playerId)
        .then(() => {
          // Cleanly disconnect and reset state
          socketService.disconnect();
          setGameState(null);
          setPlayerId(null);
          sessionStorage.removeItem("gameId");
          sessionStorage.removeItem("playerId");
        })
        .catch(err => setError(err.message));
    }
  }, [gameState, playerId]);

  const kickPlayer = useCallback((playerToKickId) => {
    if (gameState && playerId) {
      api.kickPlayer(gameState.gameId, playerId, playerToKickId)
        .catch(err => setError(err.message));
    }
  }, [gameState, playerId]);

  const setReady = useCallback(() => {
    if (gameState && playerId) {
      api.setReadyStatus(gameState.gameId, playerId)
        .catch(err => setError(err.message));
    }
  }, [gameState, playerId]);

  const sendChatMessage = useCallback((message) => {
    if (gameState && playerId) {
      api.sendChatMessage(gameState.gameId, playerId, message)
        .catch(err => setError(err.message));
    }
  }, [gameState, playerId]);

  return {
    gameState,
    error,
    loading,
    playerId,
    playerName,
    setPlayerName,
    publicGames,
    fetchPublicGames,
    createGame,
    joinGameById,
    startGame,
    proposeTeam,
    submitVote,
    playMissionCard,
    resetGame,
    leaveGame,
    kickPlayer,
    setReady,
    sendChatMessage,
  };
};
