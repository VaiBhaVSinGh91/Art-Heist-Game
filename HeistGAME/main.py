import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from modules.database import get_valkey_client
from modules.game import router as game_router, connection_manager, GameState,handle_player_exit

app = FastAPI()

# --- CORS Middleware (for development) ---
# This allows the frontend development server (e.g., http://localhost:5173)
# to make requests to this backend.
# In a production environment, you would want to restrict this to your actual
# frontend's domain.
# A list of allowed origins for development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# For production, get the frontend URL from an environment variable
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    print(f"--- Adding {frontend_url} to CORS origins ---")
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routes ---
# Include all the game logic routes from our module
app.include_router(game_router, prefix="/api/v1")

# --- WebSocket Connection ---
# This is the endpoint the frontend will connect to for real-time updates.
@app.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    
    db_client = get_valkey_client()
    game_json = db_client.get(game_id)
    if not game_json:
        await websocket.close(code=1008)
        return
    
    game = GameState.model_validate_json(game_json)
    if player_id not in game.players:
        await websocket.close(code=1008)
        return

    await connection_manager.connect(game_id, player_id, websocket)
    try:
        while True:
            # Keep the connection alive, listening for disconnect
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(game_id, player_id)
        # Use the new shared handler for both clean exits and disconnects
        await handle_player_exit(game_id, player_id, db_client)
        
@app.get("/test-cors")
async def test_cors_endpoint():
    print("--- /test-cors endpoint was hit successfully! ---")
    return {"message": "CORS is working!"}