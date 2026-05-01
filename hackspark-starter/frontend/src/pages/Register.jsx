import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { Notice } from '../components/common/Notice.jsx';
import { ROUTES } from '../utils/constants.js';

export const Register = () => {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    try {
      await register(form.name, form.email, form.password);
      navigate(ROUTES.PRODUCTS);
    } catch {
      // Error is handled by context
    }
  };

  return (
    <Panel 
      title="Create account" 
      subtitle="Sign up to start renting products on RentPi."
    >
      <form 
        onSubmit={handleSubmit}
        className="max-w-md bg-white border border-rent-100 rounded-lg p-6 space-y-4"
      >
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="Your full name"
        />

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
          minLength={6}
          placeholder="Create a password (min 6 characters)"
        />

        {error && <Notice kind="error">{error}</Notice>}

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full"
          loading={loading}
        >
          Register
        </Button>

        <p className="text-sm text-rent-700 text-center">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate(ROUTES.LOGIN)}
            className="text-rent-500 font-semibold hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </Panel>
  );
};

export default Register;
