import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import styles from './AIAssistant.module.css';

const API_BASE = 'http://localhost:3000';


const hasTamil = (text) => /[\u0B80-\u0BFF]/.test(text || '');

export default function AIAssistant() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Idle');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechAvailable, setIsSpeechAvailable] = useState(true);

  const recognitionRef = useRef(null);


  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setIsSpeechAvailable(false);
      setStatus('Speech recognition is not available in this browser.');
    }
  }, []);



  async function runQuery(message) {
    const msg = (message || '').trim();
    if (!msg) return;

    setLoading(true);
    setErrorText('');
    setSuggestions([]);
    setStatus('Thinking…');

    try {
      const baseRes = await fetch(`${API_BASE}/api/assistant/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      const baseData = await baseRes.json();
      console.log('[Assistant /query]', baseData);

      if (!baseRes.ok) {
        throw new Error(baseData.error || 'Assistant query failed');
      }

      setSuggestions(baseData.suggestions || []);

      const isTamilInput = hasTamil(msg);

      
      if (isTamilInput) {
        setStatus('Here are some suggestions.');
        return;
      }

    
      const aiRes = await fetch(`${API_BASE}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      const aiData = await aiRes.json();
      console.log('[Groq /api/ai/assistant]', aiData);

      if (aiRes.ok && aiData.reply) {
        setStatus(`DYNE AI says: ${aiData.reply}`);
      } else {
       
        setStatus(baseData.explanation || 'Here are some suggestions.');
      }
    } catch (err) {
      console.error('runQuery error:', err);
      setStatus('Server error');
      setErrorText('Something went wrong while getting suggestions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAskClick() {
    if (!text.trim()) return;
    await runQuery(text);
  }
async function handleSurpriseClick() {
  setLoading(true);
  setStatus('Picking a surprise place for you…');
  setErrorText('');
  setSuggestions([]);

  try {
    const res = await fetch(`${API_BASE}/api/assistant/surprise`);
    const data = await res.json();
    console.log('[Surprise]', data);

    if (!res.ok) throw new Error(data.error || 'Request failed');

  
    if (data && data.suggestion) {
      const s = data.suggestion;

      setStatus(
        s.reason || 'Here is a random restaurant you can try today.'
      );

      setSuggestions([
        {
          name: s.name,
          area: s.area,
          rating: s.rating,
          reason: s.reason,
        },
      ]);
    } else {
      setStatus('No restaurants found.');
    }
  } catch (err) {
    console.error('Surprise error:', err);
    setStatus('Server error');
    setErrorText('Could not fetch a surprise recommendation.');
  } finally {
    setLoading(false);
  }
}



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
      setErrorText('Speech recognition is not available in this browser.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;

    // You can still set ta-IN so users can talk in Tamil.
    // AI will be called only if text is English.
    recognition.lang = 'ta-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎙 onstart');
      setIsListening(true);
      setStatus('Listening… speak in Tamil or English.');
      setErrorText('');
    };

    recognition.onresult = (event) => {
      console.log('🎧 onresult', event.results);
      const transcript = event.results[0][0].transcript;
      setIsListening(false);

      if (transcript && transcript.trim()) {
        const cleaned = transcript.trim();
        setText(cleaned);
        setStatus('Heard: ' + cleaned);
        runQuery(cleaned); // reuse the same flow as text Ask
      } else {
        setStatus('Could not understand. Please try again.');
      }
    };

    recognition.onerror = (event) => {
      console.log('❌ onerror', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setStatus('Microphone permission blocked.');
        setErrorText(
          'Allow microphone access in your browser settings (lock icon near the URL).'
        );
      } else if (event.error === 'no-speech') {
        setStatus('No speech detected. Please speak louder or closer to the mic.');
      } else if (event.error === 'audio-capture') {
        setStatus('No microphone detected.');
        setErrorText('Select an input device in your system sound settings.');
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
      setErrorText('Speech recognition is not available in this browser.');
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
          Type or speak your craving. If you use Tamil, Dyne will show suggestions but AI text stays in English.
        </p>
      </header>

      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Ex: cheap biryani near Gandhipuram"
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
              : 'Speech recognition not available'
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
          <span className={styles.speechBadge}>✅ Voice input supported</span>
        ) : (
          <span className={styles.speechBadgeWarning}>
            ⚠️ Voice input not available in this browser
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