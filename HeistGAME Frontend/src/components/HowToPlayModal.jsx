import React from 'react';

const HowToPlayModal = ({ onClose }) => {
  return (
    <div className="modal-backdrop-light">
      <div className="modal-content" style={{ maxWidth: '700px', textAlign: 'left' }}>
        <h2 className="modal-title" style={{ textAlign: 'center' }}>HOW TO PLAY</h2>
        <div className="modal-scrollable-content">
          <div className="how-to-play-section">
            <h3>The Goal</h3>
            <p>
              Art Heist is a game of deception and deduction. The game is played in rounds, with two teams: the <span className="role-thief">Thieves</span> and the hidden <span className="role-agent">Agents</span>.
            </p>
            <ul>
              <li><strong className="role-thief">Thieves Win</strong> if they successfully complete 3 missions.</li>
              <li><strong className="role-agent">Agents Win</strong> if they cause 3 missions to fail.</li>
            </ul>
          </div>

          <div className="how-to-play-section">
            <h3>The Roles</h3>
            <dl>
              <dt className="role-thief">Thief (The Majority)</dt>
              <dd>You do not know anyone's role. Your job is to identify and exclude the Agents from mission teams. You <strong>must</strong> always play a <strong className="text-green">SUCCESS</strong> card on missions.</dd>

              <dt className="role-agent">Agent (The Minority)</dt>
              <dd>You know who your fellow Agents are. Your job is to sabotage missions by playing a <strong className="text-red">FAIL</strong> card. You can also play a <strong className="text-green">SUCCESS</strong> card to gain trust and avoid suspicion.</dd>
            </dl>
          </div>

          <div className="how-to-play-section">
            <h3>Game Flow</h3>
            <ol>
              <li><strong>Team Building:</strong> The current <strong className="text-yellow">Mastermind</strong> proposes a team to go on a mission.</li>
              <li><strong>Voting:</strong> Everyone votes to <strong className="text-green">APPROVE</strong> or <strong className="text-red">REJECT</strong> the proposed team. A majority is needed to approve.</li>
              <li><strong>Mission:</strong> If the team is approved, team members secretly play a mission card.</li>
              <li><strong>Reveal:</strong> The cards are revealed. Usually, just one <strong className="text-red">FAIL</strong> card is enough to sabotage the mission.</li>
              <li><strong>Repeat:</strong> The Mastermind role passes to the next player, and a new round begins.</li>
            </ol>
             <p>If 5 teams are rejected in a single mission round, the Agents win automatically!</p>
          </div>
        </div>
        <button className="btn btn-red" onClick={onClose} style={{ marginTop: '20px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}>
          Got It
        </button>
      </div>
    </div>
  );
};

export default HowToPlayModal;