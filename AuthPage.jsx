import React, { useState } from 'react';
import axios from 'axios';
import { Database, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import './AuthPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login flow
        const params = new URLSearchParams();
        params.append('username', formData.email);
        params.append('password', formData.password);

        const res = await axios.post(`${API_BASE_URL}/auth/token`, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const token = res.data.access_token;
        localStorage.setItem('sqhelp_token', token);
        
        // Setup axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Get user profile
        const userRes = await axios.get(`${API_BASE_URL}/auth/me`);
        onLogin(userRes.data);
      } else {
        // Sign-up flow
        await axios.post(`${API_BASE_URL}/auth/signup`, {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
        });

        // Auto-login after sign-up
        const params = new URLSearchParams();
        params.append('username', formData.email);
        params.append('password', formData.password);
        const res = await axios.post(`${API_BASE_URL}/auth/token`, params);
        
        const token = res.data.access_token;
        localStorage.setItem('sqhelp_token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const userRes = await axios.get(`${API_BASE_URL}/auth/me`);
        onLogin(userRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-container">
        <div className="auth-header">
          <Database size={36} className="auth-logo" />
          <h1>SQheLp</h1>
          <p>Democratize data access for everyone</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          
          {error && <div className="auth-error">{error}</div>}

          {!isLogin && (
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <User size={18} />
                <input
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label>Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : isLogin ? 'Sign In' : 'Sign Up'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              className="auth-toggle-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              type="button"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
