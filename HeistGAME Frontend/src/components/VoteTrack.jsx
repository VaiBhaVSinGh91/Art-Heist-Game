import React from 'react';

const VoteTrack = ({ voteTrack }) => {
  return (
    <div className="info-board">
      <h3 className="info-board-title">VOTE TRACK</h3>
      <div className="vote-track">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className={`vote-marker ${index < voteTrack ? 'failed' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default VoteTrack;
