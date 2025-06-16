import { useState, useRef, useEffect } from 'react'
import './App.css'

// Access browser SpeechRecognition implementation
// @ts-ignore
const SpeechRecognition = (window.SpeechRecognition || (window as any).webkitSpeechRecognition);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<any | null>(null);

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
    const API_URL = 'http://localhost:8000/api/chat';
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: transcript }),
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = data.response ?? 'Извините, произошла ошибка';
        addMessage('assistant', reply);
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
    <div className="App">
      <h1>Голосовой ассистент</h1>
      <button onClick={startListening}>Говорить</button>

      <div className="chat-window">
        {messages.map((m: Message, idx: number) => (
          <div key={idx} className={`message ${m.role}`}>
            <strong>{m.role === 'user' ? 'Вы: ' : 'ИИ: '}</strong>
            {m.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  )
}

export default App
