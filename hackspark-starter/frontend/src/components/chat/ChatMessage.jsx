import React from 'react';
import { classNames } from '../../utils/helpers.js';
import { User, Bot } from 'lucide-react';

export const ChatMessage = ({ 
  role, 
  content,
  isTyping = false 
}) => {
  const isUser = role === 'user';

  return (
    <div
      className={classNames(
        'flex gap-3 max-w-[85%]',
        isUser ? 'flex-row-reverse ml-auto' : 'mr-auto'
      )}
    >
      <div
        className={classNames(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-rent-500 text-white' : 'bg-rent-100 text-rent-700'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={classNames(
          'rounded-lg px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-rent-500 text-white'
            : 'bg-rent-50 text-rent-950 border border-rent-100',
          isTyping && 'opacity-70'
        )}
      >
        {isTyping ? (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
