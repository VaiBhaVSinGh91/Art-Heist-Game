import React from 'react';
// Correctly import the default export
import {GameRules} from '../services/GameRules';

const MissionTrack = ({ missionHistory, playerCount }) => {
  // The missions object is keyed by player count (e.g., '5', '6').
  // We get the correct array of team sizes based on the playerCount.
  const missionTeamSizes = GameRules.missions[playerCount] || [];

  return (
    <div className="info-board">
      <h3 className="info-board-title">MISSIONS</h3>
      <div className="mission-track">
        {missionTeamSizes.map((teamSize, index) => {
          const missionNumber = index + 1;
          const result = missionHistory.find(h => h.missionNumber === missionNumber);
          
          let statusClass = 'pending';
          if (result) {
            statusClass = result.result === 'SUCCESS' ? 'success' : 'failure';
          }

          return (
            <div key={missionNumber} className={`mission-card ${statusClass}`}>
              <span className="mission-card-team-size">{teamSize}</span>
              <span>
                {result && result.result === 'FAILURE' && `(${result.failVotes})`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MissionTrack;
