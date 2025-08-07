import React, { useEffect, useRef, useContext } from 'react';
import ChatInput from './ChatInput';
import { GameContext } from '../contexts/GameContext';

const LogAndChat = () => {
  const logEndRef = useRef(null);
  const { gameState } = useContext(GameContext);

  // Defensively get data from gameState, defaulting to empty arrays
  const log = gameState?.gameLog || [];
  const chatHistory = gameState?.chatHistory || [];

  // Combine and sort logs and chat messages by their timestamp
  const combinedFeed = [
    ...log.map(entry => ({ ...entry, type: 'log' })),
    ...chatHistory.map(entry => ({ ...entry, type: 'chat' }))
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [combinedFeed.length]);

  return (
    <div className="log-chat-wrapper">
      <div className="log-chat-entries">
        {combinedFeed.map((entry, index) => {
          if (entry.type === 'log') {
            return <p key={index} className="log-entry-item">{`> ${entry.message}`}</p>;
          }
          if (entry.type === 'chat') {
            return (
              <p key={index} className="chat-entry-item">
                <strong style={{ color: entry.senderColor || '#ffffff' }}>
                  {entry.senderName}:
                </strong> {entry.message}
              </p>
            );
          }
          return null;
        })}
        <div ref={logEndRef} />
      </div>
      <ChatInput />
    </div>
  );
};

export default LogAndChat;
