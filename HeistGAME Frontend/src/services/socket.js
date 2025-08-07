class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(gameId, playerId, onMessageCallback, onDisconnectCallback) {
    // If a socket exists and is trying to connect or is open, do nothing.
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      console.log("WebSocket connection already exists or is connecting.");
      return;
    }

    // Dynamically construct the WebSocket URL from the API base URL.
    // This replaces http/https with ws/wss.
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBaseUrl = apiBaseUrl.replace(/^https?:\/\//, '');
    const socketURL = `${wsProtocol}://${wsBaseUrl}/ws/${gameId}/${playerId}`;
    this.socket = new WebSocket(socketURL);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessageCallback(message);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");
      this.socket = null; // Clear the socket instance on close
      if (onDisconnectCallback) {
        onDisconnectCallback();
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      // Don't nullify the socket here, onclose will be called anyway.
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Export a single instance of the service
export const socketService = new SocketService();