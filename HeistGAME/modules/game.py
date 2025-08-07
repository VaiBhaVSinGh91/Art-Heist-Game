import uuid
import random
import copy
from fastapi import APIRouter, HTTPException, Query, Body, WebSocket, Depends, Response
from fastapi.encoders import jsonable_encoder
from typing import Dict, List
from .database import get_valkey_client
import asyncio
from redis import Redis as Valkey  # Use Redis type hint, aliased for clarity

from .game_models import GameState, Player, GameStatus, Role, Phase, ProposeTeamRequest, SubmitVoteRequest, VoteChoice, Winner, MissionChoice, PlayMissionCardRequest, Mission, JoinGameResponse, LogEntry, SendChatRequest, ChatMessage, KickPlayerRequest

# --- Real-time Connection Management ---

class ConnectionManager:
    def __init__(self):
        # {game_id: {player_id: WebSocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, game_id: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
        self.active_connections[game_id][player_id] = websocket

    def disconnect(self, game_id: str, player_id: str):
        if game_id in self.active_connections and player_id in self.active_connections[game_id]:
            del self.active_connections[game_id][player_id]

    async def broadcast(self, game_id: str, game_state: GameState):
        if game_id in self.active_connections:
            # Create a base message that can be modified
            base_message = jsonable_encoder(game_state)

            for player_id, websocket in self.active_connections[game_id].items():
                # Deep copy the message to avoid modifying the base for other players
                player_specific_message = copy.deepcopy(base_message)

                # --- Only redact information if the game is in progress ---
                if game_state.status == GameStatus.IN_PROGRESS:
                    # Determine the set of agent IDs for this game, if roles are assigned
                    agent_ids = {
                        p_id for p_id, p_data in game_state.players.items() if p_data.role == Role.AGENT
                    }

                    # The player receiving the message
                    recipient_player = game_state.players.get(player_id)
                    is_recipient_agent = recipient_player and recipient_player.role == Role.AGENT

                    # Redact roles from other players based on the rules
                    for p_id_to_check, p_data_to_check in player_specific_message["players"].items():
                        # A player can always see their own role and mission choice.
                        if p_id_to_check == player_id:
                            continue

                        # Redact mission choice for everyone else. This is critical for game security.
                        p_data_to_check["missionChoice"] = None

                        # An agent can see other agents' roles
                        if is_recipient_agent and p_id_to_check in agent_ids:
                            continue
                        # Otherwise, redact the role
                        p_data_to_check["role"] = None

                await websocket.send_json(player_specific_message)

connection_manager = ConnectionManager()



# Game Balancing Matrix from Section 2.4 of the design document.
GAME_BALANCING_MATRIX = {
    # total_players: {"thieves": int, "agents": int}
    5: {"thieves": 3, "agents": 2},
    6: {"thieves": 4, "agents": 2},
    7: {"thieves": 4, "agents": 3},
    8: {"thieves": 5, "agents": 3},
}

# Mission Team Size Matrix from Section 2.4 of the design document.
# Using 0-based indexing for missions (mission 1 is at index 0)
MISSION_TEAM_SIZES = {
    # total_players: [m1, m2, m3, m4, m5] team sizes
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
}

CHAT_COLORS = [
    "#82c9ff",  # Light Blue
    "#a6e22e",  # Lime Green
    "#ff6b6b",  # Light Red
    "#facc15",  # Yellow
    "#e066ff",  # Light Purple
    "#ff9f43",  # Orange
    "#48dbfb",  # Cyan
    "#1dd1a1",  # Teal
]

AVAILABLE_CHARACTERS = [f"char{i}" for i in range(1, 9)]

def _get_next_mastermind(game: GameState) -> str:
    """
    Determines the next Mastermind using the established playerOrder.
    """
    if not game.mastermindId or not game.playerOrder:
        # Fallback if data is missing
        online_players = [pid for pid, p in game.players.items() if p.isOnline]
        return random.choice(online_players) if online_players else ""

    try:
        current_index = game.playerOrder.index(game.mastermindId)
    except ValueError:
        current_index = -1 # Mastermind not in order, start from beginning

    # Loop through playerOrder to find the next online player
    for i in range(1, len(game.playerOrder) + 1):
        next_index = (current_index + i) % len(game.playerOrder)
        next_player_id = game.playerOrder[next_index]
        if game.players.get(next_player_id) and game.players[next_player_id].isOnline:
            return next_player_id
            
    return "" # Fallback if no one is online

def _log_event(game: GameState, message: str):
    """
    Adds a new entry to the game log.
    """
    game.gameLog.append(LogEntry(message=message))

# NEW: Dependency to fetch and validate game state
async def get_game_state_from_db(game_id: str) -> GameState:
    """
    FastAPI dependency to fetch and validate a game state from the database.
    This runs for any endpoint that includes `game: GameState = Depends(get_game_state_from_db)`.
    It handles the repetitive logic of getting a DB client, fetching the game,
    and raising a 404 if not found.
    """
    db_client = get_valkey_client()
    game_json = db_client.get(game_id)
    if not game_json:
        raise HTTPException(status_code=404, detail=f"Game with ID '{game_id}' not found.")
    
    game = GameState.model_validate_json(game_json)
    return game

async def handle_player_exit(game_id: str, player_id: str, db_client: Valkey):
    """
    Handles all logic for a player leaving or disconnecting from a game.
    """
    game_json = db_client.get(game_id)
    if not game_json:
        return

    game = GameState.model_validate_json(game_json)
    
    if player_id not in game.players or not game.players[player_id].isOnline:
        # Player already handled or not in game
        return

    exiting_player = game.players[player_id]
    _log_event(game, f"{exiting_player.displayName} has left the game.")

    # Mark player as offline
    game.players[player_id].isOnline = False

    # Check for game termination conditions
    online_players_count = sum(1 for p in game.players.values() if p.isOnline)
    is_host_leaving = game.hostId == player_id
    not_enough_players = game.status != GameStatus.LOBBY and online_players_count < 5

    if (is_host_leaving or not_enough_players) and game.status != GameStatus.FINISHED:
        # Host is leaving OR not enough players to continue, terminate the game.
        if is_host_leaving:
            _log_event(game, "The host has left. The game has been terminated.")
        else:
            _log_event(game, "Not enough players to continue. The game has been terminated.")
        
        game.status = GameStatus.FINISHED
        
        # Broadcast the final "aborted" state
        await connection_manager.broadcast(game_id, game)
        
        # Clean up
        db_client.delete(game_id)
        if game.isPublic:
            db_client.srem("public_lobbies", game_id)
        
        # Disconnect everyone
        if game_id in connection_manager.active_connections:
            for ws in list(connection_manager.active_connections[game_id].values()):
                await ws.close(code=1000) # Normal closure
            if game_id in connection_manager.active_connections:
                del connection_manager.active_connections[game_id]
        return

    # --- Game continues, handle turn progression if necessary ---
    # If the game is in the lobby, we just broadcast the new player status.
    if game.status == GameStatus.LOBBY:
        db_client.set(game.gameId, game.model_dump_json())
        await connection_manager.broadcast(game_id, game)
        return
        
    # If the leaving player was on a mission in progress, void it.
    if game.phase == Phase.MISSION and game.proposedTeam and player_id in game.proposedTeam:
        _log_event(game, "Mission aborted because a team member went offline.")
        # This logic is the same as a rejected vote
        game.roundNumber += 1
        game.mastermindId = _get_next_mastermind(game)
        game.phase = Phase.TEAM_SELECTION
        game.proposedTeam = None
    # If the leaving player was the mastermind, pass the turn.
    elif game.phase == Phase.TEAM_SELECTION and game.mastermindId == player_id:
        game.mastermindId = _get_next_mastermind(game)
        _log_event(game, f"The Mastermind went offline. The new Mastermind is {game.players[game.mastermindId].displayName}.")

    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game_id, game)

router = APIRouter()

# NEW: This function handles GET requests to list public games.
@router.get("/games")
async def get_public_games():
    """
    Retrieves a list of all public games that are currently in the LOBBY state.
    This is now highly efficient using a Valkey Set.
    """
    db_client = get_valkey_client()
    public_game_ids = list(db_client.smembers("public_lobbies"))

    public_lobbies = []
    if not public_game_ids:
        return public_lobbies

    # Fetch the full game objects for only the public lobby IDs
    for game_id in public_game_ids:
        game_json = db_client.get(game_id)
        if game_json:
            game = GameState.model_validate_json(game_json)
            # Double-check status just in case of an orphaned entry
            if game.status == GameStatus.LOBBY:
                public_lobbies.append({
                    "gameId": game.gameId,
                    "hostName": game.players[game.hostId].displayName,
                    "playerCount": len(game.players)
                })

    return public_lobbies


@router.get("/games/{game_id}", response_model=GameState)
async def get_game(game: GameState = Depends(get_game_state_from_db)):
    """
    Retrieves the full state of a specific game.
    The game state is fetched by the `get_game_state_from_db` dependency.
    """
    return game

@router.post("/games/", response_model=GameState, status_code=201)
async def create_game(
    host_display_name: str = Query(..., description="The display name of the player creating the game."),
    is_public: bool = Query(False, description="Whether the game should be listed publicly.")
):
    print("--- CREATE GAME: START ---")
    try:
        db_client = get_valkey_client()
        print("--- CREATE GAME: Got Valkey client. ---")

        game_id = str(uuid.uuid4())[:8]
        host_id = str(uuid.uuid4())
        print(f"--- CREATE GAME: Generated gameId: {game_id}, hostId: {host_id} ---")

        # FIX: Assign a character to the host upon creation
        host_character = random.choice(AVAILABLE_CHARACTERS)
        # NEW: Assign a chat color to the host
        host_color = random.choice(CHAT_COLORS)

        host_player = Player(
            uid=host_id,
            displayName=host_display_name,
            character=host_character,
            chatColor=host_color,
            isReady=True # The host is always ready
        )

        new_game = GameState(
            gameId=game_id,
            hostId=host_id,
            players={host_id: host_player},
            isPublic=is_public,
            playerOrder=[host_id]
        )
        print("--- CREATE GAME: Created GameState object in memory. ---")

        game_json = new_game.model_dump_json()
        print("--- CREATE GAME: Serialized game state to JSON. ---")

        db_client.set(new_game.gameId, game_json)
        print(f"--- CREATE GAME: Successfully saved game {new_game.gameId} to Valkey. ---")

        if new_game.isPublic:
            db_client.sadd("public_lobbies", new_game.gameId)
            print(f"--- CREATE GAME: Added game {new_game.gameId} to public lobbies set. ---")

        _log_event(new_game, f"Game created by {host_player.displayName}.")
        print("--- CREATE GAME: Returning response. ---")
        return new_game

    except Exception as e:
        print(f"--- CREATE GAME: UNHANDLED EXCEPTION - {e} ---")
        # Re-raise to ensure FastAPI returns a 500 error
        raise

@router.post("/games/{game_id}/join", response_model=JoinGameResponse)
async def join_game(
    display_name: str = Query(..., description="The display name of the player joining the game."),
    game: GameState = Depends(get_game_state_from_db)
):
    print("--- JOIN GAME: START ---")
    try:
        # The game object is now provided by the dependency.
        # We still need a client to write the updated state back.
        db_client = get_valkey_client()
        game_id = game.gameId
        print(f"--- JOIN GAME: Game state for {game_id} loaded from dependency. ---")

        if not hasattr(game, 'playerOrder') or game.playerOrder is None:
            print("--- JOIN GAME: playerOrder missing, initializing as empty list. ---")
            game.playerOrder = []

        if game.status != GameStatus.LOBBY:
            print(f"--- JOIN GAME: ERROR - Game status is {game.status}, not LOBBY ---")
            raise HTTPException(status_code=400, detail="Game is already in progress.")

        if len(game.players) >= 8:
            print("--- JOIN GAME: ERROR - Lobby is full ---")
            raise HTTPException(status_code=400, detail="Game lobby is full.")

        print("--- JOIN GAME: Validation passed, adding new player. ---")
        new_player_id = str(uuid.uuid4())
        
        # The character assignment logic remains the same, but 'assigned_character'
        # will now be an integer (e.g., 0, 1, 2) instead of a string.
        used_characters = {p.character for p in game.players.values() if p.character is not None}
        available = [char for char in AVAILABLE_CHARACTERS if char not in used_characters]

        if not available:
            raise HTTPException(status_code=500, detail="No available characters.")
            
        # NEW: Assign a chat color to the new player
        used_colors = {p.chatColor for p in game.players.values() if p.chatColor}
        available_colors = [color for color in CHAT_COLORS if color not in used_colors]
        assigned_color = available_colors[0] if available_colors else random.choice(CHAT_COLORS)

        assigned_character = available[0]

        new_player = Player(
            uid=new_player_id,
            displayName=display_name,
            character=assigned_character,
            chatColor=assigned_color
        )
        game.players[new_player_id] = new_player
        
        print(f"--- JOIN GAME: Appending new player {new_player_id} to playerOrder. ---")
        game.playerOrder.append(new_player_id)
        
        _log_event(game, f"{display_name} has joined the game.")
        print("--- JOIN GAME: Saving updated game state to Valkey... ---")
        db_client.set(game.gameId, game.model_dump_json())
        print("--- JOIN GAME: Game state saved. Broadcasting update. ---")

        await connection_manager.broadcast(game_id, game)
        print("--- JOIN GAME: Broadcast complete. Returning response. ---")

        return JoinGameResponse(new_player_id=new_player_id, game_state=game)

    except Exception as e:
        print(f"--- JOIN GAME: UNHANDLED EXCEPTION - {e} ---")
        # Re-raise the exception to ensure FastAPI returns a 500 error
        raise

@router.post("/games/{game_id}/leave", status_code=204)
async def leave_game(
    player_id: str = Body(..., embed=True, description="The UID of the player leaving the game."),
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Allows a player to cleanly exit a game.
    """
    db_client = get_valkey_client()
    await handle_player_exit(game.gameId, player_id, db_client)
    return Response(status_code=204)

@router.post("/games/{game_id}/ready", response_model=GameState)
async def toggle_ready_status(
    player_id: str = Body(..., embed=True, description="The UID of the player toggling their ready status."),
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Allows a player to toggle their ready status in the lobby.
    """
    db_client = get_valkey_client()

    if game.status != GameStatus.LOBBY:
        raise HTTPException(status_code=400, detail="Can only change ready status in the lobby.")

    if player_id in game.players:
        player = game.players[player_id]
        player.isReady = not player.isReady
        db_client.set(game.gameId, game.model_dump_json())
        await connection_manager.broadcast(game.gameId, game)

    return game

@router.post("/games/{game_id}/kick", response_model=GameState)
async def kick_player(
    request: KickPlayerRequest,
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Allows the host to kick a player from the lobby.
    """
    db_client = get_valkey_client()

    # --- Validation ---
    if game.hostId != request.host_id:
        raise HTTPException(status_code=403, detail="Only the host can kick players.")
    
    if game.status != GameStatus.LOBBY:
        raise HTTPException(status_code=400, detail="Players can only be kicked while in the lobby.")

    if request.player_to_kick_id not in game.players:
        raise HTTPException(status_code=404, detail="Player to kick not found in this game.")

    if request.player_to_kick_id == request.host_id:
        raise HTTPException(status_code=400, detail="Host cannot kick themselves.")

    # --- Logic ---
    kicked_player = game.players.pop(request.player_to_kick_id)
    
    # Also remove from playerOrder
    if request.player_to_kick_id in game.playerOrder:
        game.playerOrder.remove(request.player_to_kick_id)

    _log_event(game, f"{kicked_player.displayName} was kicked by the host.")

    # Save and broadcast to remaining players
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game.gameId, game)

    # Forcefully disconnect the kicked player
    if game.gameId in connection_manager.active_connections:
        kicked_ws = connection_manager.active_connections[game.gameId].get(request.player_to_kick_id)
        if kicked_ws:
            await kicked_ws.close(code=1000, reason="Kicked from lobby by host")
            connection_manager.disconnect(game.gameId, request.player_to_kick_id)

    return game

@router.post("/games/{game_id}/start", response_model=GameState)
async def start_game(
    player_id: str = Body(..., embed=True, description="The UID of the host player starting the game."),
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Begins the game from the lobby. This can only be done by the host.
    """
    db_client = get_valkey_client()
    # Validation from design doc (Section 6.2)
    if game.hostId != player_id:
        raise HTTPException(status_code=403, detail="Only the host can start the game.")

    # FIX: Check the number of *online* players before starting.
    online_players_count = sum(1 for p in game.players.values() if p.isOnline)
    ready_players_count = sum(1 for p in game.players.values() if p.isOnline and p.isReady)

    if not (5 <= online_players_count <= 8):
        raise HTTPException(status_code=400, detail=f"Game requires 5-8 online players, but has {online_players_count}.")

    if online_players_count != ready_players_count:
        raise HTTPException(status_code=400, detail="Not all players are ready.")

    if game.status != GameStatus.LOBBY:
        raise HTTPException(status_code=400, detail="Game has already started.")

    # If this game was in the public list, remove it now that it's starting.
    if game.isPublic:
        db_client.srem("public_lobbies", game.gameId)
    # --- Game Start Logic ---
    player_ids = [pid for pid, p in game.players.items() if p.isOnline]
    random.shuffle(player_ids)

    balance = GAME_BALANCING_MATRIX[online_players_count]
    num_agents = balance["agents"]

    for i, pid in enumerate(player_ids):
        game.players[pid].role = Role.AGENT if i < num_agents else Role.THIEF
        game.players[pid].isReady = False # Reset for next game

    game.phase = Phase.AGENT_REVEAL
    game.status = GameStatus.IN_PROGRESS
    _log_event(game, "The game has started! Assigning roles...")
    
    # --- Save the updated state back to Valkey ---
    db_client.set(game.gameId, game.model_dump_json())

    await connection_manager.broadcast(game.gameId, game)

    # --- NEW: Start a background task to automatically move to the next phase ---
    asyncio.create_task(handle_agent_reveal_conclusion(game.gameId, game))

    return game


async def handle_agent_reveal_conclusion(game_id: str, game: GameState):
    """
    A helper function to manage the automatic transition after the agent reveal phase.
    """
    # 1. Wait for a few seconds so players can see their roles
    await asyncio.sleep(7)

    # 2. Re-fetch the game state to prevent race conditions
    db_client = get_valkey_client()
    game_json = db_client.get(game_id)
    # It's possible the game was reset during the sleep
    if not game_json or GameState.model_validate_json(game_json).phase != Phase.AGENT_REVEAL:
        return
    game = GameState.model_validate_json(game_json)

    # 3. Transition to the first round
    game.phase = Phase.TEAM_SELECTION
    player_ids = list(game.players.keys())
    game.mastermindId = random.choice(player_ids)
    _log_event(game, f"Agents have been revealed. The first Mastermind is {game.players[game.mastermindId].displayName}.")
    
    # --- Save the updated state back to Valkey ---
    db_client.set(game.gameId, game.model_dump_json())

    # 4. Broadcast the new state
    await connection_manager.broadcast(game.gameId, game)



@router.post("/games/{game_id}/propose-team", response_model=GameState)
async def propose_team(request: ProposeTeamRequest, game: GameState = Depends(get_game_state_from_db)):
    """
    The Mastermind proposes a team for the current mission.
    """
    # --- Validation from design doc (Section 6.2) ---
    db_client = get_valkey_client()
    if game.status != GameStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Game is not in progress.")

    if game.phase != Phase.TEAM_SELECTION:
        raise HTTPException(status_code=400, detail=f"Cannot propose a team during the {game.phase.value} phase.")

    if game.mastermindId != request.player_id:
        raise HTTPException(status_code=403, detail="Only the Mastermind can propose a team.")

    player_count = len(game.players)
    required_team_size = MISSION_TEAM_SIZES[player_count][game.missionNumber - 1]

    if len(request.team) != required_team_size:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid team size. Mission {game.missionNumber} requires {required_team_size} players, but {len(request.team)} were proposed."
        )

    # Ensure no duplicate players are proposed and all are valid
    if len(set(request.team)) != len(request.team):
        raise HTTPException(status_code=400, detail="Proposed team contains duplicate players.")

    for team_member_id in request.team:
        if team_member_id not in game.players:
            raise HTTPException(status_code=400, detail=f"Proposed team contains an invalid player ID: {team_member_id}")

    # --- State Transition ---
    game.proposedTeam = request.team
    game.phase = Phase.TEAM_VOTE
    game.votes = {}  # Clear previous votes and prepare for new ones
    team_names = ", ".join([game.players[p_id].displayName for p_id in request.team])
    _log_event(game, f"{game.players[request.player_id].displayName} proposed a team: {team_names}.")
    
    # --- Save the updated state back to Valkey ---
    db_client.set(game.gameId, game.model_dump_json())


    await connection_manager.broadcast(game.gameId, game)

    return game

async def handle_mission_conclusion(game_id: str, game: GameState):
    """
    A helper function to manage the automatic transition after a mission reveal.
    """
    # 1. Transition to REVEAL and broadcast
    game.phase = Phase.REVEAL
    game.acknowledgements = [] # Reset acks for the mission reveal screen
    db_client = get_valkey_client()
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game_id, game)

    # 2. Wait for a few seconds so players can see the result
    await asyncio.sleep(6) # Longer sleep for mission results

    # 3. Re-fetch the game state to prevent race conditions
    game_json = db_client.get(game_id)
    if not game_json or game.status == GameStatus.FINISHED:
        return
    game = GameState.model_validate_json(game_json)

    # 4. Transition to the next round
    game.missionNumber += 1
    game.roundNumber = 1 # Reset vote track for new mission
    game.mastermindId = _get_next_mastermind(game)
    game.phase = Phase.TEAM_SELECTION
    game.proposedTeam = None
    game.votes = {} # Reset votes for the new round
    for p in game.players.values():
        p.missionChoice = None

    # 5. Save and broadcast the final state
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game_id, game)

@router.post("/games/{game_id}/submit-vote", response_model=GameState)
async def submit_vote(request: SubmitVoteRequest, game: GameState = Depends(get_game_state_from_db)):
    """
    A player casts their vote on the proposed team.
    If this is the final vote, the result is tallied and the game state advances.
    """
    # --- Validation from design doc (Section 6.2) ---
    db_client = get_valkey_client()
    if game.status != GameStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Game is not in progress.")

    if game.phase != Phase.TEAM_VOTE:
        raise HTTPException(status_code=400, detail=f"Cannot vote during the {game.phase.value} phase.")

    if request.player_id not in game.players:
        raise HTTPException(status_code=404, detail="Player not found in this game.")

    # Defensively initialize votes if it's None. This is a safeguard.
    if game.votes is None:
        game.votes = {}

    if request.player_id in game.votes:
        raise HTTPException(status_code=400, detail="Player has already voted.")

    # --- Record the vote ---
    game.votes[request.player_id] = request.vote
    
    # --- Broadcast the intermediate state so players can see who has voted ---
    # This is good for UX as it shows votes coming in live.
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game.gameId, game)

    # If this is the final vote, trigger the conclusion logic as a background task.
    # This allows us to return an immediate response to the final voter.
    if len(game.votes) == len(game.players):
        asyncio.create_task(handle_vote_conclusion(game.gameId, game))

    # The immediate response is just the game state with the latest vote recorded.
    # The final state change will come via WebSocket after the background task completes.
    return game

async def handle_vote_conclusion(game_id: str, game: GameState):
    """
    A new helper function to manage the automatic transition after a vote.
    """
    # 1. Transition to VOTE_REVEAL and broadcast
    game.phase = Phase.VOTE_REVEAL
    db_client = get_valkey_client()
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game_id, game)

    # 2. Wait for a few seconds so players can see the result
    await asyncio.sleep(4)

    # 3. Calculate the outcome and transition to the next phase
    approve_votes = sum(1 for v in game.votes.values() if v == VoteChoice.APPROVE)
    reject_votes = len(game.players) - approve_votes
    was_approved = approve_votes > reject_votes

    if was_approved:
        game.phase = Phase.MISSION
        _log_event(game, f"Team approved ({approve_votes}-{reject_votes}). Mission starting.")
        if game.proposedTeam:
            for p_id in game.proposedTeam:
                if game.players.get(p_id):
                    game.players[p_id].missionChoice = None
    else: # Team Rejected
        game.roundNumber += 1
        if game.roundNumber > 5:
            game.status = GameStatus.FINISHED
            game.winner = Winner.AGENTS
            _log_event(game, "Team rejected 5 times in a row. Agents win!")
        else:
            game.mastermindId = _get_next_mastermind(game)
            game.phase = Phase.TEAM_SELECTION
            _log_event(game, f"Team rejected ({approve_votes}-{reject_votes}). New mastermind is {game.players[game.mastermindId].displayName}.")
        game.proposedTeam = None

    game.votes = {} # Reset votes for the next round

    # 4. Save and broadcast the final state
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game_id, game)


@router.post("/games/{game_id}/chat", response_model=GameState)
async def send_chat_message(
    request: SendChatRequest,
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Allows a player to send a chat message to the game.
    """
    db_client = get_valkey_client()

    if request.player_id not in game.players:
        raise HTTPException(status_code=403, detail="Player not in this game.")

    if not request.message or len(request.message.strip()) == 0:
        raise HTTPException(status_code=400, detail="Chat message cannot be empty.")

    if len(request.message) > 200:  # Simple validation
        raise HTTPException(status_code=400, detail="Chat message is too long.")

    sender = game.players[request.player_id]

    chat_message = ChatMessage(
        senderId=sender.uid,
        senderName=sender.displayName,
        message=request.message.strip(),
        senderColor=sender.chatColor
    )

    game.chatHistory.append(chat_message)

    # Save and broadcast
    db_client.set(game.gameId, game.model_dump_json())
    await connection_manager.broadcast(game.gameId, game)

    return game

@router.post("/games/{game_id}/acknowledge-vote-reveal", response_model=GameState)
async def acknowledge_vote_reveal(
    player_id: str = Body(..., embed=True, description="The UID of the player acknowledging the vote results."),
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Allows a player to acknowledge the vote results, moving the game to the next phase.
    """
    # NOTE: This endpoint appears to be obsolete due to the automatic transition
    # handled by `handle_vote_conclusion`. The frontend no longer calls this.
    # Consider removing it to simplify the codebase.
    # I'm leaving the implementation here for reference.

    db_client = get_valkey_client()
    if game.phase != Phase.VOTE_REVEAL:
        raise HTTPException(status_code=400, detail="Can only acknowledge vote results during the VOTE_REVEAL phase.")

    if player_id not in game.players:
        raise HTTPException(status_code=403, detail="Player not in this game.")

    if player_id not in game.acknowledgements:
        game.acknowledgements.append(player_id)
        # Broadcast the intermediate state so all clients can update their UI
        await connection_manager.broadcast(game.gameId, game)

    # If all players have acknowledged, move to the next phase
    if len(game.acknowledgements) == len(game.players):
        # Re-calculate vote result to determine next phase
        approve_votes = sum(1 for v in game.votes.values() if v == VoteChoice.APPROVE)
        reject_votes = len(game.players) - approve_votes

        if approve_votes > reject_votes:
            # --- Team Approved: Move to MISSION ---
            game.phase = Phase.MISSION
            _log_event(game, "Team was approved. Moving to mission phase.")
            # Clear mission choices for the players on the new mission
            for p_id in game.proposedTeam:
                game.players[p_id].missionChoice = None
        else:
            # --- Team Rejected: Move to next TEAM_SELECTION ---
            game.roundNumber += 1
            if game.roundNumber > 5:
                game.status = GameStatus.FINISHED
                game.winner = Winner.AGENTS
                _log_event(game, "Team rejected 5 times in a row. Agents win!")
            else:
                game.mastermindId = _get_next_mastermind(game)
                game.phase = Phase.TEAM_SELECTION
                _log_event(game, f"Team was rejected. New mastermind is {game.players[game.mastermindId].displayName}.")
            game.proposedTeam = None

        game.votes = {}
        game.acknowledgements = []
        
        db_client.set(game.gameId, game.model_dump_json())  # Save the updated state back to Valkey

        await connection_manager.broadcast(game.gameId, game)


    return game


@router.post("/games/{game_id}/reset", response_model=GameState)
async def reset_game(
    player_id: str = Body(..., embed=True, description="The UID of the host player resetting the game."),
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Resets a finished game back to the lobby state, keeping all players.
    Only the host can perform this action.
    """
    db_client = get_valkey_client()
    if game.hostId != player_id:
        raise HTTPException(status_code=403, detail="Only the host can reset the game.")

    if game.status != GameStatus.FINISHED:
        raise HTTPException(status_code=400, detail="Can only reset a game that is finished.")

    # --- Reset Game State to Lobby ---
    game.status = GameStatus.LOBBY
    game.missionNumber = 1
    game.roundNumber = 1
    game.mastermindId = None
    game.phase = Phase.TEAM_SELECTION # Default phase
    game.proposedTeam = None
    game.votes = {}
    game.missionHistory = []
    game.winner = None

    _log_event(game, f"Host {game.players[player_id].displayName} has reset the game for a new round.")
    # Reset player-specific fields
    for p in game.players.values():
        p.role = None
        p.missionChoice = None
    
    db_client.set(game.gameId, game.model_dump_json())  # Save the updated state back to Valkey 
    await connection_manager.broadcast(game.gameId, game)
    return game

@router.post("/games/{game_id}/acknowledge-reveal", response_model=GameState)
async def acknowledge_reveal(
    player_id: str = Body(..., embed=True, description="The UID of the player acknowledging the results."),
    game: GameState = Depends(get_game_state_from_db)
):
    """
    Allows a player to acknowledge the mission results, moving the game to the next round.
    """
    db_client = get_valkey_client()
    if game.phase != Phase.REVEAL:
        raise HTTPException(status_code=400, detail="Can only acknowledge results during the REVEAL phase.")

    if player_id not in game.players:
        raise HTTPException(status_code=403, detail="Player not in this game.")

    if player_id not in game.acknowledgements:
        game.acknowledgements.append(player_id)
        # Broadcast so UIs can update (e.g. hide the continue button for this player)
        await connection_manager.broadcast(game.gameId, game)

    # If all players have acknowledged, move to the next round
    if len(game.acknowledgements) == len(game.players):
        game.missionNumber += 1
        game.roundNumber = 1 # Reset vote track for new mission

        player_ids = list(game.players.keys())
        game.mastermindId = _get_next_mastermind(game)
        game.phase = Phase.TEAM_SELECTION
        game.proposedTeam = None
        game.votes = {} # Reset votes for the new round
        game.acknowledgements = [] # Clear acks for the next phase

        # Clear all mission choices for the next round
        for p in game.players.values():
            p.missionChoice = None

        last_mission = game.missionHistory[-1]
        _log_event(game, f"Mission {last_mission.missionNumber} was a {last_mission.result.value} with {last_mission.failVotes} fail card(s). New mastermind is {game.players[game.mastermindId].displayName}.")
        
        db_client.set(game.gameId, game.model_dump_json())  # Save the updated state back to Valkey

        await connection_manager.broadcast(game.gameId, game)

    return game

@router.post("/games/{game_id}/play-mission-card", response_model=GameState)
async def play_mission_card(request: PlayMissionCardRequest, game: GameState = Depends(get_game_state_from_db)):
    """
    A member of the Heist Team plays their card for the mission.
    If this is the final card, the mission result is determined and the game advances.
    """

    # --- Validation from design doc (Section 6.2) ---
    db_client = get_valkey_client()
    if game.status != GameStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Game is not in progress.")

    if game.phase != Phase.MISSION:
        raise HTTPException(status_code=400, detail=f"Cannot play a mission card during the {game.phase.value} phase.")

    if not game.proposedTeam or request.player_id not in game.proposedTeam:
        raise HTTPException(status_code=403, detail="Player is not on the current mission team.")

    player = game.players.get(request.player_id)
    if not player:
        # This should be caught by the check above, but is good for robustness
        raise HTTPException(status_code=404, detail="Player not found in this game.")

    if player.missionChoice is not None:
        raise HTTPException(status_code=400, detail="Player has already played a card for this mission.")

    # --- CRITICAL SECURITY RULE: Thieves must play a SUCCESS card ---
    if player.role == Role.THIEF and request.choice != MissionChoice.SUCCESS:
        raise HTTPException(status_code=403, detail="A Thief cannot play a FAIL card.")

    # --- Record the mission card choice ---
    player.missionChoice = request.choice

    # --- Save the intermediate state to the database ---
    db_client.set(game.gameId, game.model_dump_json())

    # --- Tally if all mission members have played their card ---
    mission_team_choices = [game.players[pid].missionChoice for pid in game.proposedTeam]
    if None not in mission_team_choices:
        # --- All cards are in, determine mission outcome ---
        fail_cards_played = mission_team_choices.count(MissionChoice.FAIL) # This is safe because only Agents can play FAIL
        
        # Determine if the mission failed based on the rules
        is_special_mission_4 = game.missionNumber == 4 and len(game.players) >= 7
        mission_failed = (is_special_mission_4 and fail_cards_played >= 2) or \
                         (not is_special_mission_4 and fail_cards_played >= 1)
        
        mission_result = MissionChoice.FAIL if mission_failed else MissionChoice.SUCCESS

        # Update mission history
        game.missionHistory.append(Mission(
            missionNumber=game.missionNumber,
            team=list(game.proposedTeam),
            result=mission_result,
            failVotes=fail_cards_played
        ))

        # Check for game-ending conditions
        successes = sum(1 for m in game.missionHistory if m.result == MissionChoice.SUCCESS)
        failures = sum(1 for m in game.missionHistory if m.result == MissionChoice.FAIL)

        if successes >= 3:
            game.status = GameStatus.FINISHED
            game.winner = Winner.THIEVES
            _log_event(game, "Thieves have completed 3 missions successfully!")
        elif failures >= 3:
            game.status = GameStatus.FINISHED
            game.winner = Winner.AGENTS
            _log_event(game, "Agents have sabotaged 3 missions!")

        # Trigger the conclusion logic as a background task.
        asyncio.create_task(handle_mission_conclusion(game.gameId, game))

    await connection_manager.broadcast(game.gameId, game)

    return game
