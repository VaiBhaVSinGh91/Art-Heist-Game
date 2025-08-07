from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime
import uuid

# Using Enums for strict validation of game states, as per the design doc.
class GameStatus(str, Enum):
    LOBBY = "LOBBY"
    IN_PROGRESS = "IN_PROGRESS"
    FINISHED = "FINISHED"

class Phase(str, Enum):
    AGENT_REVEAL = "AGENT_REVEAL"
    TEAM_SELECTION = "TEAM_SELECTION"
    TEAM_VOTE = "TEAM_VOTE"
    VOTE_REVEAL = "VOTE_REVEAL"
    MISSION = "MISSION"
    REVEAL = "REVEAL"

class Role(str, Enum):
    THIEF = "THIEF"
    AGENT = "AGENT"

class MissionChoice(str, Enum):
    SUCCESS = "SUCCESS"
    FAIL = "FAIL"

class VoteChoice(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"

class Winner(str, Enum):
    THIEVES = "THIEVES"
    AGENTS = "AGENTS"

# Sub-model for a log entry
class LogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: str

# NEW: Sub-model for a chat message
class ChatMessage(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    senderId: str
    senderName: str
    message: str
    senderColor: str

# Sub-model for a Player, as defined in Section 5.3
class Player(BaseModel):
    uid: str = Field(default_factory=lambda: str(uuid.uuid4()))
    displayName: str
    isReady: bool = False
    isOnline: bool = True
    role: Optional[Role] = None
    missionChoice: Optional[MissionChoice] = None
    character: Optional[str] = None # Optional character ID for customization
    chatColor: Optional[str] = None

# Sub-model for a Mission in the history, as defined in Section 5.3
class Mission(BaseModel):
    missionNumber: int
    team: List[str] # List of player uids
    result: Optional[MissionChoice] = None # SUCCESS or FAILURE
    failVotes: int = 0

# The root Game State Object, as defined in Section 5.2
class GameState(BaseModel):
    gameId: str
    status: GameStatus = GameStatus.LOBBY
    hostId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    players: Dict[str, Player] # Keyed by player uid
    isPublic: bool = Field(default=False, alias='isPublic')

    # Game progression fields
    missionNumber: int = 1
    roundNumber: int = 1 # Corresponds to the Vote Track
    mastermindId: Optional[str] = None
    phase: Phase = Phase.TEAM_SELECTION

    # Round-specific fields
    proposedTeam: Optional[List[str]] = None # List of player uids
    votes: Dict[str, VoteChoice] = Field(default_factory=dict) # Keyed by player uid

    # History and outcome
    missionHistory: List[Mission] = []
    chatHistory: List[ChatMessage] = []
    gameLog: List[LogEntry] = []
    winner: Optional[Winner] = None
    acknowledgements: List[str] = []
    
    # FIX: Added the missing playerOrder field
    playerOrder: List[str] = Field(default_factory=list, alias='playerOrder')


# Request model for the proposeTeam endpoint
class ProposeTeamRequest(BaseModel):
    player_id: str = Field(..., description="The UID of the player proposing the team (must be the Mastermind).")
    team: List[str] = Field(..., description="A list of player UIDs to be on the mission team.", min_items=1)

# Request model for the submitVote endpoint
class SubmitVoteRequest(BaseModel):
    player_id: str = Field(..., description="The UID of the player casting the vote.")
    vote: VoteChoice

# Request model for the playMissionCard endpoint
class PlayMissionCardRequest(BaseModel):
    player_id: str = Field(..., description="The UID of the player playing the card.")
    choice: MissionChoice

# NEW: Request model for sending a chat message
class SendChatRequest(BaseModel):
    player_id: str
    message: str

# NEW: Request model for kicking a player
class KickPlayerRequest(BaseModel):
    host_id: str
    player_to_kick_id: str

# Response model for a successful joinGame request
class JoinGameResponse(BaseModel):
    new_player_id: str = Field(..., description="The UID of the player that just joined.")
    game_state: GameState = Field(..., description="The full state of the game after the join.")
