import React, { useEffect, useRef } from 'react';

const GameLog = ({ log }) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="log-content-wrapper">
      <h3 className="game-log-title">GAME LOG</h3>
      <div className="game-log-entries">
        {log.map((entry, index) => (
          <p key={index}>{`> ${entry}`}</p>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default GameLog;
