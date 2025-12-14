import { useEffect, useRef, useState } from 'react';
import { Mic, ArrowUp, MapPin, Star, Navigation } from 'lucide-react';
import styles from './AIAssistant.module.css';

const API_BASE = 'http://localhost:3000';

function getMapsUrl(r) {
  if (r.latitude && r.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
  }
  const q = `${r.name || ""} ${r.area || ""}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function AIAssistant() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! I'm Dyne. Tell me what you're craving, and I'll find the perfect spot for you.",
      restaurants: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechAvailable, setIsSpeechAvailable] = useState(true);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setIsSpeechAvailable(false);
  }, []);

  async function runQuery(message) {
    const msg = (message || '').trim();
    if (!msg) return;

    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: msg }]);
    setInputText('');
    setLoading(true);

    try {
      console.log("📤 Sending query:", msg);

      const res = await fetch(`${API_BASE}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("📥 AI Response:", data);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: data.reply || "Here are some recommendations!",
          restaurants: data.restaurants || []
        }
      ]);

    } catch (err) {
      console.error('❌ Query error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: "I'm having trouble connecting right now. Please try again! 😅",
          restaurants: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSurpriseClick() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/assistant/surprise`);
      const data = await res.json();

      if (data?.suggestion) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'bot',
            text: data.suggestion.reason || "Here's a surprise for you! 🎁",
            restaurants: [data.suggestion]
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'bot',
            text: "Couldn't find a surprise right now 😅",
            restaurants: []
          }
        ]);
      }
    } catch (err) {
      console.error('Surprise error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Voice recognition
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) recognitionRef.current.abort();

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (transcript.trim()) runQuery(transcript.trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      startVoice();
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    runQuery(inputText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleNavigate = (restaurant) => {
    window.open(getMapsUrl(restaurant), '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.chatStream}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${msg.type === 'user' ? styles.userRow : styles.botRow}`}
          >
            {msg.type === 'bot' && (
              <div className={styles.botAvatar}>D</div>
            )}

            <div className={styles.messageContent}>
              <div className={msg.type === 'user' ? styles.userBubble : styles.botBubble}>
                {msg.text}
              </div>

              {msg.restaurants && msg.restaurants.length > 0 && (
                <div className={styles.cardContainer}>
                  {msg.restaurants.map((r, idx) => (
                    <div key={r.id || idx} className={styles.restaurantCard}>
                      <div className={styles.cardHeader}>
                        <h4 className={styles.cardTitle}>{r.name}</h4>
                        {r.rating && (
                          <span className={styles.cardRating}>
                            <Star size={10} fill="#FACC15" stroke="none" /> {r.rating}
                          </span>
                        )}
                      </div>

                      <div className={styles.cardMeta}>
                        <MapPin size={12} />
                        <span>{r.area || 'Coimbatore'}</span>
                      </div>

                      {/* Famous Dishes */}
                      {r.famous_dishes && (
                        <div className={styles.famousDishes}>
                          🍛 <strong>Famous:</strong> {r.famous_dishes}
                        </div>
                      )}

                      {/* AI Reason */}
                      {r.reason && (
                        <div className={styles.reason}>
                          💡 {r.reason}
                        </div>
                      )}

                      {/* Price */}
                      {r.avg_cost_for_two && (
                        <div className={styles.price}>
                          💰 ₹{r.avg_cost_for_two} for two
                        </div>
                      )}

                      <button
                        className={styles.navigateButton}
                        onClick={() => handleNavigate(r)}
                      >
                        <Navigation size={12} style={{ marginRight: '4px' }} />
                        Navigate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${styles.messageRow} ${styles.botRow}`}>
            <div className={styles.botAvatar}>D</div>
            <div className={styles.typingIndicator}>
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className={styles.footer}>
        <div className={styles.chipRow}>
          <button
            className={styles.surpriseChip}
            onClick={handleSurpriseClick}
            disabled={loading}
          >
            🎁 Surprise Me
          </button>
        </div>

        <div className={styles.inputBar}>
          <input
            type="text"
            className={styles.textInput}
            placeholder="Type or speak a dish..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />

          <div className={styles.inputActions}>
            <button
              className={`${styles.iconButton} ${isListening ? styles.listening : ''}`}
              onClick={handleMicClick}
              disabled={!isSpeechAvailable}
            >
              <Mic size={18} />
            </button>

            <button
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!inputText.trim() || loading}
            >
              <ArrowUp size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}