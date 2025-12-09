import { useState } from 'react';
import styles from './AuthPanel.module.css';

const API_BASE = 'http://localhost:3000';

function AuthPanel({ onUserLogin, onAdminLogin, onClose, isDark }) {
  const [role, setRole] = useState('user');
  const [mode, setMode] = useState('login');      // "login" | "register"
  const [name, setName] = useState('');           // name field
  const [age, setAge] = useState('');             // ✅ age field
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setStatus('');
    setIsError(false);

    if (nextMode === 'login') {
      setName('');
      setAge('');          // ✅ clear age when switching to login
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');
    setIsError(false);

    // ----- basic validation -----
    if (mode === 'register') {
      if (!name.trim()) {
        setStatus('Please enter your name.');
        setIsError(true);
        return;
      }

      if (!age) {
        setStatus('Please enter your age.');
        setIsError(true);
        return;
      }

      const ageNumber = Number(age);
      if (Number.isNaN(ageNumber) || ageNumber <= 0) {
        setStatus('Please enter a valid age.');
        setIsError(true);
        return;
      }
    }

    if (!email || !password) {
      setStatus('Please enter email and password.');
      setIsError(true);
      return;
    }

    try {
      setLoading(true);

      const path =
        mode === 'register'
          ? `/api/auth/${role}/register`
          : `/api/auth/${role}/login`;

      const body =
        mode === 'register'
          ? {
              name: name.trim(),
              age: Number(age),    // ✅ send age to backend
              email,
              password,
            }
          : { email, password };

      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || 'Request failed');
        setIsError(true);
        return;
      }

      // if just registered, show message and switch to login
      if (mode === 'register') {
        setStatus('Registered successfully. You can login now.');
        switchMode('login');
        return;
      }

      // ---------- LOGIN SUCCESS ----------
      if (role === 'user') {
        if (data.token) {
          localStorage.setItem('smartdine_user_token', data.token);
        }

        onUserLogin?.({
          ...data.user,
          token: data.token,
        });
      } else {
        if (data.token) {
          localStorage.setItem('smartdine_admin_token', data.token);
        }

        onAdminLogin?.({
          ...data.admin,
          token: data.token,
        });
      }

      onClose?.();
    } catch (err) {
      console.error('Auth error', err);
      setStatus('Server error. Try again.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.overlay} ${!isDark ? styles.overlayLight : ''}`}>
      <div className={`${styles.authCard} ${!isDark ? styles.authCardLight : ''}`}>
        <div className={`${styles.cardInner} ${!isDark ? styles.cardInnerLight : ''}`}>

          {/* Top bar */}
          <div className={styles.topRow}>
            <div className={styles.roleTabs}>
              <button
                type="button"
                className={`${styles.roleTab} ${role === 'user' ? styles.roleTabActive : ''}`}
                onClick={() => setRole('user')}
              >
                User
              </button>
              <button
                type="button"
                className={`${styles.roleTab} ${role === 'admin' ? styles.roleTabActive : ''}`}
                onClick={() => setRole('admin')}
              >
                Admin
              </button>
            </div>
            <button className={styles.closeBtn} onClick={onClose} type="button">
              ✕
            </button>
          </div>

          {/* Heading */}
          <div className={styles.titleRow}>
            <h3 className={styles.title}>
              {mode === 'login' ? 'Login to Dyne' : 'Create an account'}
            </h3>

            <div className={styles.modeToggleWrapper}>
              {mode === 'login' ? (
                <>
                  <span>New here?</span>
                  <button
                    type="button"
                    className={styles.modeLink}
                    onClick={() => switchMode('register')}
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    className={styles.modeLink}
                    onClick={() => switchMode('login')}
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Name + Age only in register mode */}
            {mode === 'register' && (
              <>
                <div>
                  <label className={styles.label}>Name</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className={styles.label}>Age</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="1"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="Your age"
                  />
                </div>
              </>
            )}

            <div>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={styles.label}>Password</label>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {status && (
              <p className={isError ? styles.error : styles.success}>
                {status}
              </p>
            )}

            <button className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthPanel;