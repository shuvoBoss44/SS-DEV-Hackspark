import React, { useState } from 'react';
import { Button } from '../common/Button.jsx';
import { Send } from 'lucide-react';

export const ChatInput = ({ 
  onSend, 
  disabled = false,
  placeholder = "Ask about trending products..."
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 pt-4 border-t border-rent-100">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-h-12 px-4 bg-white border border-rent-100 rounded-lg
                   focus:outline-none focus:border-rent-500 focus:ring-2 focus:ring-rent-500/20
                   placeholder:text-rent-300 disabled:opacity-50"
      />
      <Button 
        type="submit" 
        variant="primary"
        disabled={disabled || !input.trim()}
      >
        <Send className="w-4 h-4 mr-2" />
        Send
      </Button>
    </form>
  );
};

export default ChatInput;
