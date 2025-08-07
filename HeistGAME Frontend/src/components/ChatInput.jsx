import React, { useState, useContext } from 'react';
import { GameContext } from '../contexts/GameContext';

const ChatInput = () => {
    const [message, setMessage] = useState('');
    const { sendChatMessage } = useContext(GameContext);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            sendChatMessage(message.trim());
            setMessage('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="chat-input-form">
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="chat-input"
                maxLength="200"
            />
            <button type="submit" className="chat-send-button">Send</button>
        </form>
    );
};

export default ChatInput;