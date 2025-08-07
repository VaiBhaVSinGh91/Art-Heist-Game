// The base URL for your backend's HTTP API.
// Use the environment variable provided by Vite, with a fallback for local development.
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`;

// A helper function to handle fetch requests and errors.
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'An unknown error occurred');
  }
  return response.json();
};

export const api = {
  // NEW: Function to get the list of public games.
  getPublicGames: async () => {
    const response = await fetch(`${API_BASE_URL}/games`);
    return handleResponse(response);
  },

  getGame: async (gameId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
    return handleResponse(response);
  },

  // FIX: Updated to pass the 'isPublic' flag to the backend.
  createGame: async (playerName, isPublic) => {
    const response = await fetch(`${API_BASE_URL}/games/?host_display_name=${encodeURIComponent(playerName)}&is_public=${isPublic}`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Joins a game and returns the game state and the new player's ID.
  joinGame: async (gameId, playerName) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/join?display_name=${encodeURIComponent(playerName)}`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Starts the game.
  startGame: async (gameId, playerId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    return handleResponse(response);
  },

  // Proposes a team for a mission.
  proposeTeam: async (gameId, playerId, team) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/propose-team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, team: team }),
    });
    return handleResponse(response);
  },

  // Submits a vote for a proposed team.
  submitVote: async (gameId, playerId, vote) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/submit-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, vote: vote ? 'APPROVE' : 'REJECT' }),
    });
    return handleResponse(response);
  },
  
  // Acknowledges the vote results.
  acknowledgeVoteReveal: async (gameId, playerId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/acknowledge-vote-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    return handleResponse(response);
  },

  // Plays a card during a mission.
  playMissionCard: async (gameId, playerId, choice) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/play-mission-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, choice: choice }),
    });
    return handleResponse(response);
  },
  
  resetGame: async (gameId, playerId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    return handleResponse(response);
  },
  
  leaveGame: async (gameId, playerId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    // A 204 response has no content, so we don't try to parse JSON.
    if (!response.ok && response.status !== 204) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'An unknown error occurred');
    }
    // Return nothing on success
    return;
  },

  kickPlayer: async (gameId, hostId, playerToKickId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_id: hostId, player_to_kick_id: playerToKickId }),
    });
    return handleResponse(response);
  },

  setReadyStatus: async (gameId, playerId) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    });
    return handleResponse(response);
  },

  sendChatMessage: async (gameId, playerId, message) => {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, message: message }),
    });
    return handleResponse(response);
  },
};
