import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import './index.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/auth`;

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!isLogin && !acceptedTerms) {
      toast.error('You must accept the Terms & Conditions');
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const { data } = await axios.post(`${API_URL}${endpoint}`, { username, password });
      
      if (!isLogin) {
        // Automatically login after register
        const loginRes = await axios.post(`${API_URL}/login`, { username, password });
        localStorage.setItem('dora_token', loginRes.data.token);
        localStorage.setItem('dora_user', JSON.stringify(loginRes.data.user));
        toast.success('Account created successfully!');
        onLogin(loginRes.data.token, loginRes.data.user);
      } else {
        localStorage.setItem('dora_token', data.token);
        localStorage.setItem('dora_user', JSON.stringify(data.user));
        toast.success(`Welcome back, ${data.user.username}!`);
        onLogin(data.token, data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDummySocial = (provider) => {
    toast(`Continue with ${provider} is not configured yet.`, { icon: '🚧' });
  };

  return (
    <div className="auth-layout" style={{ background: '#000', color: '#fff' }}>
      {/* Sidebar / Aesthetic Side */}
      <div className="auth-sidebar" style={{ background: '#0a0a0a', borderRight: '1px solid #333' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ zIndex: 1, maxWidth: '400px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ background: '#111', border: '1px solid #333', padding: '0.5rem', borderRadius: '1rem' }}>
              <CheckCircle2 size={32} color="#fff" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>Taskify</h1>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1.2, marginBottom: '1.5rem', color: '#fff' }}>
            Organize your work, <br/>one task at a time.
          </h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.7, lineHeight: 1.6, color: '#ccc' }}>
            Join Dora and thousands of others who are boosting their productivity and achieving their goals every day.
          </p>
        </motion.div>
      </div>

      {/* Form Side */}
      <div className="auth-content" style={{ background: '#000' }}>
        <motion.div 
          className="auth-card"
          style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p style={{ color: '#aaa' }}>
              {isLogin ? 'Please enter your details to sign in.' : 'Sign up to get started with Taskify.'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Username</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter your username"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ marginBottom: 0 }}>Password</label>
                {isLogin && (
                  <button type="button" onClick={() => toast("Forgot password link sent! (Simulated)")} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  style={{ background: '#111', color: '#fff', border: '1px solid #333' }}
                  placeholder="Enter your password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="form-group" 
                style={{ marginBottom: 0 }}
              >
                <label>Confirm Password</label>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  style={{ background: '#111', color: '#fff', border: '1px solid #333' }}
                  placeholder="Confirm your password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required={!isLogin} 
                />
              </motion.div>
            )}

            {!isLogin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="terms" style={{ cursor: 'pointer', marginBottom: 0, color: '#aaa' }}>
                  I agree to the <span style={{ color: '#fff', textDecoration: 'underline' }}>Terms</span> and <span style={{ color: '#fff', textDecoration: 'underline' }}>Privacy Policy</span>.
                </label>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', height: '2.75rem', background: '#fff', color: '#000' }} disabled={isLoading}>
              {isLoading ? <div className="loader" style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#000' }}></div> : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#aaa' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setUsername('');
                setPassword('');
                setConfirmPassword('');
              }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
