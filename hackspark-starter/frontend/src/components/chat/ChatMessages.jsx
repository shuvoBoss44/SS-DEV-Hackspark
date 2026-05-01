import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage.jsx';
import { Notice } from '../common/Notice.jsx';

export const ChatMessages = ({ 
  messages, 
  loading,
  error 
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {error && (
        <div className="mb-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Notice>
              Start a new RentPi conversation. Ask about products, availability, 
              trends, or recommendations.
            </Notice>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
            />
          ))
        )}
        
        {loading && (
          <ChatMessage role="assistant" content="" isTyping />
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
