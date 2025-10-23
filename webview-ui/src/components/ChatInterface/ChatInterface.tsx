/**
 * Main chat interface component
 */

import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { sendUserMessage } from '../../utils/vscode';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import './ChatInterface.css';

export const ChatInterface: React.FC = () => {
  const { messages, isProcessing, currentAgent, addMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'assistant-message':
          addMessage({
            role: 'assistant',
            type: message.payload.type || 'text',
            content: message.payload.content,
            agentName: message.payload.agentName,
            workflowStage: message.payload.workflowStage,
            metadata: message.payload.metadata,
          });
          break;

        case 'error':
          addMessage({
            role: 'system',
            type: 'error',
            content: message.payload.error || 'An error occurred',
          });
          break;

        case 'system-message':
          addMessage({
            role: 'system',
            type: 'text',
            content: message.payload.content,
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addMessage]);

  const handleSendMessage = (messageText: string) => {
    // Add user message to chat
    addMessage({
      role: 'user',
      type: 'text',
      content: messageText,
    });

    // Send to extension
    sendUserMessage(messageText);
  };

  return (
    <div className="chat-interface">
      <div className="chat-interface__messages">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isProcessing && (
          <div className="chat-interface__typing">
            <span className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
            {currentAgent && <span className="typing-text">{currentAgent} is thinking...</span>}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isProcessing} />
    </div>
  );
};
