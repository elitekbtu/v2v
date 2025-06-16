import { useState, useRef, useEffect } from 'react'
import { FiPlus, FiMessageCircle } from 'react-icons/fi'
import './App.css'

// Access browser SpeechRecognition implementation
// @ts-ignore
const SpeechRecognition = (window.SpeechRecognition || (window as any).webkitSpeechRecognition);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: number;
  created_at: string;
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<any | null>(null);

  const API_BASE = 'http://localhost:8000/api';

  // fetch sessions on mount
  useEffect(() => {
    fetch(`${API_BASE}/session`)
      .then((res) => res.json())
      .then((data) => setSessions(data));
  }, []);

  const loadSession = (id: number) => {
    setCurrentSession(id);
    fetch(`${API_BASE}/session/${id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages));
  };

  const createNewSession = () => {
    fetch(`${API_BASE}/session`, { method: 'POST' })
      .then((res) => res.json())
      .then((sess) => {
        setSessions([sess, ...sessions]);
        setMessages([]);
        setCurrentSession(sess.id);
      });
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev: Message[]) => [...prev, { role, content }]);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    window.speechSynthesis.speak(utterance);
  };

  const handleResult = (transcript: string) => {
    addMessage('user', transcript);

    // Send to backend
    const body = { message: transcript, session_id: currentSession };
    fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = data.response ?? 'Извините, произошла ошибка';
        addMessage('assistant', reply);

        if (!currentSession) {
          // when first message creates session
          setCurrentSession(data.session_id);
          setSessions((prev) => {
            const exists = prev.find((s) => s.id === data.session_id);
            if (exists) return prev;
            return [{ id: data.session_id, created_at: new Date().toISOString() }, ...prev];
          });
        }
        speak(reply);
      })
      .catch(() => {
        const errMsg = 'Ошибка связи с сервером';
        addMessage('assistant', errMsg);
        speak(errMsg);
      });
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      alert('SpeechRecognition API не поддерживается вашим браузером');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      handleResult(transcript);
    };

    recognition.onerror = () => {
      alert('Ошибка распознавания речи');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // Auto scroll chat to bottom when messages update
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <button className="new-chat" onClick={createNewSession}><FiPlus /> Новый чат</button>
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.id} className={s.id === currentSession ? 'active' : ''} onClick={() => loadSession(s.id)}>
              <FiMessageCircle /> Чат #{s.id}
            </li>
          ))}
        </ul>
      </aside>

      <main className="App">
        <h1>Голосовой ассистент</h1>
        <button onClick={startListening}>Говорить</button>

        <div className="chat-window">
          {messages.map((m: Message, idx: number) => (
            <div key={idx} className={`message ${m.role}`}>
              {m.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </main>
    </div>
  )
}

export default App
