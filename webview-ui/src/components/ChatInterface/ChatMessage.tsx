/**
 * Individual chat message component
 */

import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/chat.types';
import './ChatMessage.css';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { role, type, content, agentName, timestamp, metadata } = message;

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`chat-message chat-message--${role}`} data-type={type}>
      <div className="chat-message__header">
        <span className="chat-message__role">
          {role === 'assistant' && agentName ? agentName : role === 'user' ? 'You' : 'System'}
        </span>
        <span className="chat-message__time">{formatTime(timestamp)}</span>
      </div>

      <div className="chat-message__content">
        {type === 'code' ? (
          <pre className="chat-message__code">
            <code>{content}</code>
          </pre>
        ) : type === 'error' ? (
          <div className="chat-message__error">
            <span className="error-icon">⚠️</span>
            {content}
          </div>
        ) : (
          <div className="chat-message__text">{content}</div>
        )}

        {metadata?.pythonCode && type === 'agent-output' && (
          <details className="chat-message__details">
            <summary>View Generated Code</summary>
            <pre className="chat-message__code">
              <code>{metadata.pythonCode}</code>
            </pre>
          </details>
        )}

        {metadata?.executionSuccess !== undefined && (
          <div className={`chat-message__status ${metadata.executionSuccess ? 'success' : 'failed'}`}>
            {metadata.executionSuccess ? '✅ Executed successfully' : '❌ Execution failed'}
            {metadata.executionTime && (
              <span className="execution-time"> ({metadata.executionTime}ms)</span>
            )}
          </div>
        )}

        {metadata?.suggestions && metadata.suggestions.length > 0 && (
          <div className="chat-message__suggestions">
            <strong>Next steps:</strong>
            <ul>
              {metadata.suggestions.map((suggestion, idx) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
