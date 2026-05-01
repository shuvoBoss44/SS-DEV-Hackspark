import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { Panel } from '../components/common/Panel.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { ChatSidebar } from '../components/chat/ChatSidebar.jsx';
import { ChatMessages } from '../components/chat/ChatMessages.jsx';
import { ChatInput } from '../components/chat/ChatInput.jsx';
import { generateUUID } from '../utils/helpers.js';

export const Chat = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(generateUUID());
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const data = await api.get('/chat/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Open a session
  const openSession = useCallback(async (sessionId) => {
    setActiveSessionId(sessionId);
    setError('');
    try {
      const data = await api.get(`/chat/${sessionId}/history`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
      setMessages([]);
    }
  }, []);

  // Start new chat
  const newChat = useCallback(() => {
    setActiveSessionId(generateUUID());
    setMessages([]);
    setError('');
  }, []);

  // Send message
  const sendMessage = useCallback(async (text) => {
    setLoading(true);
    setError('');
    
    // Optimistically add user message
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const data = await api.post('/chat', { 
        sessionId: activeSessionId, 
        message: text 
      });
      
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: data.reply }
      ]);
      
      // Refresh sessions list
      loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, loadSessions]);

  return (
    <Panel 
      title="Chat assistant" 
      subtitle="Ask grounded RentPi questions about rentals, products, availability, trends, and recommendations."
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSessionClick={openSession}
          onNewChat={newChat}
          loading={sessionsLoading}
        />

        <div className="bg-white border border-rent-100 rounded-lg p-4 h-[600px] flex flex-col">
          <ChatMessages
            messages={messages}
            loading={loading}
            error={error}
          />
          <ChatInput
            onSend={sendMessage}
            disabled={loading}
          />
        </div>
      </div>
    </Panel>
  );
};

export default Chat;
