import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Panel } from '../components/common/Panel.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { StatCard } from '../components/analytics/StatCard.jsx';
import { Search, User } from 'lucide-react';

export const Profile = () => {
  const [userId, setUserId] = useState('42');
  const [state, setState] = useState({ 
    loading: false, 
    error: '', 
    data: null 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '', data: null });
    
    try {
      const data = await api.get(`/users/${userId}/discount`);
      setState({ loading: false, error: '', data });
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  };

  return (
    <Panel 
      title="Profile lookup" 
      subtitle="Check a renter's trust score and discount tier."
    >
      <form 
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 bg-white border border-rent-100 rounded-lg p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rent-100 flex items-center justify-center">
            <User className="w-5 h-5 text-rent-500" />
          </div>
          <Input
            label="Central user ID"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            min="1"
            placeholder="Enter user ID"
            containerClassName="min-w-[160px]"
          />
        </div>

        <Button 
          type="submit" 
          variant="primary"
          loading={state.loading}
          className="self-end"
        >
          <Search className="w-4 h-4 mr-2" />
          Lookup
        </Button>
      </form>

      {state.error && <Notice kind="error">{state.error}</Notice>}

      {state.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="User ID" value={state.data.userId} />
          <StatCard label="Security Score" value={state.data.securityScore} />
          <StatCard label="Discount" value={`${state.data.discountPercent}%`} />
        </div>
      )}
    </Panel>
  );
};

export default Profile;
