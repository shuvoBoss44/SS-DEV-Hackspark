import React from 'react';
import { Button } from '../common/Button.jsx';
import { SessionItem } from './SessionItem.jsx';
import { Plus } from 'lucide-react';

export const ChatSidebar = ({ 
  sessions, 
  activeSessionId, 
  onSessionClick, 
  onNewChat,
  loading = false 
}) => {
  return (
    <aside className="bg-white border border-rent-100 rounded-lg p-4 h-[600px] flex flex-col">
      <Button 
        variant="primary" 
        className="w-full mb-4"
        onClick={onNewChat}
      >
        <Plus className="w-4 h-4 mr-2" />
        New Chat
      </Button>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-rent-100/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-rent-700 text-center py-8">
            No chat sessions yet.
          </p>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.sessionId}
              session={session}
              isActive={session.sessionId === activeSessionId}
              onClick={() => onSessionClick(session.sessionId)}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
