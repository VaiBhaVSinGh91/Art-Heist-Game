import React, { useState, useEffect, useContext } from 'react';
import { GameRules } from '../services/GameRules';
import playSound, { sounds } from '../services/sound';
import { SettingsContext } from '../contexts/SettingsContext';

// --- MODAL COMPONENTS (could be in separate files) ---

const RoleRevealModal = ({ player, otherAgents }) => (
  <div className="modal-backdrop">
    <div className="modal-content">
      <h3 className="modal-title">YOUR ROLE IS...</h3>
      {player.role === 'AGENT' ? (
        <div className="agent-info">
          <h2 className="role-agent">AGENT</h2>
          <p>Your fellow agents are: <strong>{otherAgents.map(a => a.displayName).join(', ') || 'None'}</strong></p>
          <p>Work together to sabotage 3 missions.</p>
        </div>
      ) : (
        <div className="thief-info">
          <h2 className="role-thief">THIEF</h2>
          <p>Find the agents and ensure 3 missions succeed.</p>
        </div>
      )}
      <p style={{marginTop: '20px', fontStyle: 'italic'}}>The first round will begin shortly...</p>
    </div>
  </div>
);


const TeamSelectionModal = ({ players, teamSize, onPropose }) => {
  const [selected, setSelected] = useState([]);

  const togglePlayer = (id) => {
    setSelected(current => 
      current.includes(id) ? current.filter(pId => pId !== id) : [...current, id]
    );
  };

  const canPropose = selected.length === teamSize;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3 className="modal-title">SELECT YOUR TEAM</h3>
        <p className="modal-description">Choose {teamSize} players for the mission.</p>
        <div className="player-list" style={{marginBottom: '2rem'}}>
          {players.map(p => (
            <button
              key={p.uid}
              onClick={() => togglePlayer(p.uid)}
              className={`player-card ${selected.includes(p.uid) ? 'selected' : ''} ${!p.isOnline ? 'offline' : ''}`}
              disabled={!p.isOnline}
            >
              {p.displayName}
            </button>
          ))}
        </div>
        <button className="btn btn-green" disabled={!canPropose} onClick={() => onPropose(selected)}>
          Propose Team
        </button>
      </div>
    </div>
  );
};


const TeamVoteModal = ({ proposedTeam, onVote, setIsSubmitting }) => {
    const { settings } = useContext(SettingsContext);
    const handleVoteClick = async (vote) => {
      playSound(sounds.VOTE_CAST, settings.volume);
      setIsSubmitting(true);
      try {
        await onVote(vote);
      } catch (error) {
        // Error is already set in the context, just need to reset loading state
        setIsSubmitting(false);
      }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3 className="modal-title">TEAM PROPOSAL</h3>
                <p className="modal-description">Approve this team for the mission?</p>
                <div className="player-list" style={{marginBottom: '2rem'}}>
                    {proposedTeam.map(p => <div key={p.uid} className="player-card">{p.displayName}</div>)}
                </div>
                <div className="modal-actions">
                    <button className="btn btn-green" onClick={() => handleVoteClick(true)}>APPROVE</button>
                    <button className="btn btn-red" onClick={() => handleVoteClick(false)}>REJECT</button>
                </div>
            </div>
        </div>
    );
};


const VoteRevealModal = ({ votes, players }) => {
  const approveVotes = Object.values(votes).filter(v => v === 'APPROVE').length;
  const rejectVotes = Object.keys(players).length - approveVotes;
  const wasApproved = approveVotes > rejectVotes;

  const getVoters = (voteType) => {
    return Object.entries(votes)
      .filter(([, vote]) => vote === voteType)
      .map(([pId]) => players[pId]);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3 className={`modal-title ${wasApproved ? 'text-green' : 'text-red'}`}>
          TEAM {wasApproved ? 'APPROVED' : 'REJECTED'}
        </h3>
        <p className="modal-description">Result: {approveVotes} to {rejectVotes}</p>
        <div className="vote-results-container">
          <div className="vote-list">
            <h4>Approved By:</h4>
            <ul>{getVoters('APPROVE').map(p => p && <li key={p.uid} className={!p.isOnline ? 'offline-player-name' : ''}>{p.displayName}</li>)}</ul>
          </div>
          <div className="vote-list">
            <h4>Rejected By:</h4>
            <ul>{getVoters('REJECT').map(p => p && <li key={p.uid} className={!p.isOnline ? 'offline-player-name' : ''}>{p.displayName}</li>)}</ul>
          </div>
        </div>
        {/* The "Continue" button is removed */}
        <p style={{marginTop: '20px', fontStyle: 'italic'}}>Next round starting shortly...</p>
      </div>
    </div>
  );
};

const MissionPlayModal = ({ isAgent, onPlay }) => {
    const { settings } = useContext(SettingsContext);
    const handleSuccess = () => {
      playSound(sounds.CARD_PLAYED, settings.volume);
      onPlay("SUCCESS");
    };
    const handleFail = () => {
      playSound(sounds.CARD_PLAYED, settings.volume);
      onPlay("FAIL");
    };
  
    return (
     <div className="modal-backdrop">
      <div className="modal-content">
          <h3 className="modal-title">EXECUTE MISSION</h3>
          <p className="modal-description">Choose your action. As an {isAgent ? 'Agent' : 'Thief'}, you must act carefully.</p>
          <div className="modal-actions">
        <button className="btn btn-green" onClick={handleSuccess}>SUCCESS</button>
        <button className="btn btn-red" onClick={handleFail} disabled={!isAgent}>FAIL</button>
      </div>
    </div>
     </div>
);
};


// --- ACTION CONTROLLER ---

const GameActions = ({ gameState, playerId, proposeTeam, submitVote, playMissionCard }) =>{
  const { phase, mastermindId, players, missionNumber, proposedTeam, votes, missionTeam } = gameState;
  const me = players[playerId];

  // NEW: Local state to prevent race conditions
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSubmitting(false);
  }, [JSON.stringify(gameState.votes)]);

  if (!me) return null; // Don't render if player data isn't loaded yet

  // --- NEW: Role Reveal Phase ---
  if (phase === 'AGENT_REVEAL') {
    const otherAgents = Object.values(players).filter(p => p.role === 'AGENT' && p.uid !== playerId);
    return (
      <RoleRevealModal 
        player={me}
        otherAgents={otherAgents}
      />
    );
  }

  // --- Team Selection Phase ---
  if (phase === 'TEAM_SELECTION' && playerId === mastermindId) {
    const teamSize = GameRules.missions[Object.keys(players).length][missionNumber - 1];
    return (
      <TeamSelectionModal 
        players={Object.values(players)} 
        teamSize={teamSize} 
        onPropose={proposeTeam} 
      />
    );
  }

  if (phase === 'TEAM_VOTE') {
      // If we are currently submitting a vote, show the waiting banner immediately.
      if (isSubmitting) {
          return <div className="action-banner">Submitting vote...</div>;
      }
      // If the server state confirms you have voted, show the waiting banner.
      if (votes && votes[playerId]) {
        return <div className="action-banner">You have voted. Waiting for others...</div>;
      }
      // Otherwise, show the vote modal and pass the state setter to it.
      const team = proposedTeam.map(pId => players[pId]);
      return <TeamVoteModal proposedTeam={team} onVote={submitVote} setIsSubmitting={setIsSubmitting} />;
    }

  // --- NEW: VOTE_REVEAL Phase ---
  // Add this new if block
  if (phase === 'VOTE_REVEAL') {
    return <VoteRevealModal votes={votes} players={players} />;
  }

  // --- Mission Play Phase ---
  // Show the modal only if the player is on the team AND has not yet played a card.
  if (phase === 'MISSION' && proposedTeam && proposedTeam.includes(playerId) && me.missionChoice === null) {
    return <MissionPlayModal isAgent={me.role === 'AGENT'} onPlay={playMissionCard} />;
  }
  
  // --- Default Info Banner ---
  let bannerText = "Waiting for other players...";
  if (phase === 'TEAM_SELECTION') bannerText = `Waiting for ${players[mastermindId]?.displayName} to select a team.`;
  if (phase === 'TEAM_VOTE') bannerText = 'Waiting for votes...';
  if (phase === 'MISSION') {
    // This banner shows for players not on the mission, or for players who have already played their card.
    bannerText = 'Mission in progress...';
  }
  if (phase === 'MISSION_REVEAL' || phase === 'VOTE_REVEAL') bannerText = 'Revealing results...';

  return <div className="action-banner">{bannerText}</div>;
};

export default GameActions;
