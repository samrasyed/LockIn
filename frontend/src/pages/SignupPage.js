import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getApiErrorMessage } from '../utils/apiError';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', { name, email, password });
      login(res.data.token, res.data.user);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/')}>
        &larr; Back to Intro
      </button>
      <div style={styles.card}>
        <div style={styles.logo}>
          <Target size={48} color="#00e5a0" strokeWidth={2.5} />
        </div>
        <h1 style={styles.title}>Join LockIn</h1>
        <p style={styles.subtitle}>Start your AI-powered study journey</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
          <input style={styles.input} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={styles.link}>
          Already have an account?{' '}
          <Link to="/login" style={styles.linkText}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0e12' },
  backButton: { position: 'absolute', top: 32, left: 32, background: 'transparent', color: '#8892a4', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer' },
  card: { background: '#131a24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '48px 40px', width: '100%', maxWidth: 420, textAlign: 'center' },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: '#e8eaf0', margin: 0 },
  subtitle: { color: '#8892a4', fontSize: 14, marginBottom: 32, marginTop: 8 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px', color: '#e8eaf0', fontSize: 15, outline: 'none' },
  button: { background: '#00e5a0', color: '#080b12', border: 'none', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  link: { color: '#8892a4', fontSize: 14, marginTop: 24 },
  linkText: { color: '#00e5a0', textDecoration: 'none', fontWeight: 600 }
};
