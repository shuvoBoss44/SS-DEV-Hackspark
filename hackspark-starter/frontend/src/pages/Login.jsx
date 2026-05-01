import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { ROUTES } from '../utils/constants.js';

export const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    try {
      await login(form.email, form.password);
      navigate(ROUTES.PRODUCTS);
    } catch {
      // Error is handled by context
    }
  };

  return (
    <Panel 
      title="Welcome back" 
      subtitle="Authenticate through the API gateway and keep your session local to this browser."
    >
      <form 
        onSubmit={handleSubmit}
        className="max-w-md bg-white border border-rent-100 rounded-lg p-6 space-y-4"
      >
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          placeholder="your@email.com"
        />

        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          placeholder="Enter your password"
        />

        {error && <Notice kind="error">{error}</Notice>}

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full"
          loading={loading}
        >
          Login
        </Button>

        <p className="text-sm text-rent-700 text-center">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => navigate(ROUTES.REGISTER)}
            className="text-rent-500 font-semibold hover:underline"
          >
            Register
          </button>
        </p>
      </form>
    </Panel>
  );
};

export default Login;
