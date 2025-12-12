import { useEffect, useRef, useState } from 'react';
import { Mic, ArrowUp, MapPin, Star, Navigation } from 'lucide-react';
import styles from './AIAssistant.module.css';

const API_BASE = 'http://localhost:3000';

const hasTamil = (text) => /[\u0B80-\u0BFF]/.test(text || '');

function getMapsUrl(r) {
  if (r.latitude && r.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
  }
  const q = `${r.name || ""} ${r.area || ""} ${r.landmark || ""}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function AIAssistant({ restaurants = [] }) {
  const [inputText, setInputText] = useState('');
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! I'm Dyne. Tell me what you're craving, and I'll find the perfect spot for you.",
      suggestions: []
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

  // Helper to find real restaurant data
  const enrichSuggestions = (rawSuggestions) => {
    if (!rawSuggestions || !Array.isArray(rawSuggestions)) return [];
    
    if (!restaurants || restaurants.length === 0) return rawSuggestions;

    return rawSuggestions.map(s => {
      const match = restaurants.find(r => 
        (r.name && s.name && r.name.toLowerCase().includes(s.name.toLowerCase())) || 
        (r.name && s.name && s.name.toLowerCase().includes(r.name.toLowerCase()))
      );

      if (match) {
          return { ...s, ...match };
      }
      return s;
    });
  };

  const addMessage = (type, text, rawSuggestions = []) => {
    const processedSuggestions = enrichSuggestions(rawSuggestions);
    
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type, text, suggestions: processedSuggestions }
    ]);
  };

  async function runQuery(message) {
    const msg = (message || '').trim();
    if (!msg) return;

    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: msg }]);
    setInputText('');
    setLoading(true);

    try {
      const baseRes = await fetch(`${API_BASE}/api/assistant/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      const baseData = await baseRes.json();
      let suggestionsList = baseData.suggestions || [];
      let botReplyText = "";

      if (hasTamil(msg)) {
        botReplyText = "Here are some suggestions for you.";
      } else {
        const aiRes = await fetch(`${API_BASE}/api/ai/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg })
        });
        const aiData = await aiRes.json();
        
        if (aiRes.ok && aiData.reply) {
          botReplyText = aiData.reply.replace(/<s>/g, '').replace(/\[OUT\]/g, '').trim();
        } else {
          botReplyText = baseData.explanation || "I found some places for you.";
        }
      }

      addMessage('bot', botReplyText, suggestionsList);

    } catch (err) {
      console.error('runQuery error:', err);
      addMessage('bot', "I'm having trouble connecting to the server right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSurpriseClick() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assistant/surprise`);
      const data = await res.json();

      if (data && data.suggestion) {
        const enriched = enrichSuggestions([data.suggestion]);
        const reason = data.suggestion.reason || "Here is a random gem I picked for you!";
        
        setMessages(prev => [
            ...prev, 
            { id: Date.now(), type: 'bot', text: reason, suggestions: enriched }
        ]);
      } else {
        addMessage('bot', "I couldn't find a surprise restaurant right now.");
      }
    } catch (err) {
      addMessage('bot', "Something went wrong fetching a surprise.");
    } finally {
      setLoading(false);
    }
  }

  // --- Voice Logic ---
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) recognitionRef.current.abort();
    
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'ta-IN'; 
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

  // --- Only Navigate Handler Remains ---
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

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className={styles.cardContainer}>
                  {msg.suggestions.map((s, idx) => (
                    <div key={idx} className={styles.restaurantCard}>
                      <div className={styles.cardHeader}>
                        <h4 className={styles.cardTitle}>{s.name}</h4>
                        {s.rating && (
                          <span className={styles.cardRating}>
                            <Star size={10} fill="#FACC15" stroke="none"/> {s.rating}
                          </span>
                        )}
                      </div>
                      <div className={styles.cardMeta}>
                        <MapPin size={12} />
                        <span>{s.area || 'Coimbatore'}</span>
                      </div>
                      
                      <div className={styles.actionButtons}>
                        {/* ONLY NAVIGATE BUTTON */}
                        <button 
                          className={styles.navigateButton}
                          onClick={() => handleNavigate(s)}
                        >
                          <Navigation size={12} style={{marginRight: '4px'}}/> 
                          Navigate
                        </button>
                      </div>

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