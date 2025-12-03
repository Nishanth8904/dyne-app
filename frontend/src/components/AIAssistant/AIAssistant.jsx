import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import styles from './AIAssistant.module.css';

const API_BASE = 'http://localhost:3000';

export default function AIAssistant() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Idle');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechAvailable, setIsSpeechAvailable] = useState(true);

  const recognitionRef = useRef(null);

  // Check SpeechRecognition support once
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setIsSpeechAvailable(false);
      setStatus('Speech API not available in this browser.');
    }
  }, []);

  // ---------------- BACKEND HELPERS ----------------

  async function sendMessage(message) {
    if (!message?.trim()) return;

    setLoading(true);
    setErrorText('');

    try {
      const res = await fetch(`${API_BASE}/api/assistant/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await res.json();
      console.log('[Assistant reply]', data);

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setStatus(data.explanation || 'Got some suggestions.');
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Assistant error:', err);
      setStatus('Server error');
      setErrorText('Could not talk to Dyne backend.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAskClick() {
    const msg = text.trim();
    if (!msg) return;
    setStatus('Thinking…');
    await sendMessage(msg);
  }

  async function handleSurpriseClick() {
    setLoading(true);
    setStatus('Picking a surprise…');
    setErrorText('');
    setSuggestions([]);

    try {
      const res = await fetch(`${API_BASE}/api/assistant/surprise`);
      const data = await res.json();
      console.log('[Surprise]', data);

      if (!res.ok) throw new Error(data.error || 'Request failed');

      if (data && data.name) {
        setStatus(data.message || 'Here is a random pick!');
        setSuggestions([
          {
            name: data.name,
            area: data.area,
            rating: data.rating,
            reason: data.message
          }
        ]);
      } else {
        setStatus('No restaurants found.');
      }
    } catch (err) {
      console.error('Surprise error:', err);
      setStatus('Server error');
      setErrorText('Could not fetch surprise recommendation.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------- SPEECH RECOGNITION ----------------

  function stopRecognition() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setIsSpeechAvailable(false);
      setErrorText('Speech API not available in this browser.');
      return;
    }

    // kill any previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;

    // keep it VERY simple for debugging
    recognition.lang = 'ta-IN';  // you can change to 'ta-IN'
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎙 onstart');
      setIsListening(true);
      setStatus('Listening…');
      setErrorText('');
    };

    recognition.onresult = (event) => {
      console.log('🎧 onresult', event.results);
      const transcript = event.results[0][0].transcript;
      setIsListening(false);

      if (transcript && transcript.trim()) {
        setText(transcript.trim());
        setStatus('Heard: ' + transcript.trim());
        sendMessage(transcript.trim());
      } else {
        setStatus('Did not catch that. Try again.');
      }
    };

    recognition.onerror = (event) => {
      console.log('❌ onerror', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setStatus('Mic permission blocked.');
        setErrorText(
          'Allow microphone permission in Chrome (click the lock icon near the URL).'
        );
      } else if (event.error === 'no-speech') {
        setStatus('No speech detected. Speak louder 😊');
        // no extra error text – this is a soft error
      } else if (event.error === 'audio-capture') {
        setStatus('No microphone selected.');
        setErrorText('Select an input device in System Settings > Sound > Input.');
      } else {
        setStatus('Voice error: ' + event.error);
        setErrorText('Voice error: ' + event.error);
      }
    };

    recognition.onend = () => {
      console.log('🛑 onend');
      setIsListening(false);
    };

    try {
      console.log('calling recognition.start()');
      recognition.start();
    } catch (e) {
      console.error('start() threw', e);
      setIsListening(false);
    }
  };

  function handleMicClick() {
    if (!isSpeechAvailable) {
      setErrorText('Speech API not available in this browser.');
      return;
    }
    if (isListening) {
      stopRecognition();
    } else {
      startVoice();
    }
  }

  // ---------------- RENDER ----------------

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Sparkles size={18} />
          <span>Ask Dyne</span>
        </div>
        <p className={styles.headerSubtitle}>
          Talk in Tamil or type your craving.
        </p>
      </header>

      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Eg: மலிவு பிரியாணி near Gandhipuram"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <button
          type="button"
          className={`${styles.micButton} ${
            isListening ? styles.micButtonActive : ''
          }`}
          onClick={handleMicClick}
          disabled={!isSpeechAvailable}
          title={
            isSpeechAvailable
              ? isListening
                ? 'Stop listening'
                : 'Speak to Dyne'
              : 'Speech API not available'
          }
        >
          <Mic size={16} />
        </button>
      </div>

      <div className={styles.actionsRow}>
        <button
          className={styles.primaryButton}
          onClick={handleAskClick}
          disabled={loading || !text.trim()}
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
        <button
          className={styles.surpriseButton}
          onClick={handleSurpriseClick}
          disabled={loading}
        >
          🎁 Surprise Me
        </button>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusText}>{status}</span>
        {isSpeechAvailable ? (
          <span className={styles.speechBadge}>✅ Speech API Available</span>
        ) : (
          <span className={styles.speechBadgeWarning}>
            ⚠️ Speech API not available
          </span>
        )}
      </div>

      {errorText && <p className={styles.errorText}>{errorText}</p>}

      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((s, idx) => (
            <div key={idx} className={styles.suggestionCard}>
              <div className={styles.suggestionTitleRow}>
                <h4 className={styles.suggestionName}>{s.name}</h4>
                {s.rating != null && (
                  <span className={styles.ratingBadge}>
                    ⭐ {s.rating.toFixed ? s.rating.toFixed(1) : s.rating}
                  </span>
                )}
              </div>
              {s.area && <div className={styles.suggestionArea}>{s.area}</div>}
              {s.reason && (
                <p className={styles.suggestionReason}>{s.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}