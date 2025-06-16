import { useState, useRef, useEffect } from 'react'
import { FiPlus, FiMessageCircle, FiMic } from 'react-icons/fi'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Session {
  id: number
  created_at: string
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSession, setCurrentSession] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  const API_BASE = 'http://localhost:8000/api'

  // Fetch sessions on mount
  useEffect(() => {
    fetch(`${API_BASE}/session`)
      .then((res) => res.json())
      .then((data) => setSessions(data))
  }, [])

  const loadSession = (id: number) => {
    setCurrentSession(id)
    fetch(`${API_BASE}/session/${id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages))
  }

  const createNewSession = () => {
    fetch(`${API_BASE}/session`, { method: 'POST' })
      .then((res) => res.json())
      .then((sess) => {
        setSessions([sess, ...sessions])
        setMessages([])
        setCurrentSession(sess.id)
      })
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev: Message[]) => [...prev, { role, content }])
  }

  const speak = (text: string) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ru-RU'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    
    // Store the utterance in ref to be able to cancel it
    speechSynthesisRef.current = utterance
    
    utterance.onerror = (event) => {
      console.error('SpeechSynthesis error:', event)
    }
    
    window.speechSynthesis.speak(utterance)
  }

  const handleResult = (transcript: string) => {
    addMessage('user', transcript)

    // Send to backend
    const body = { message: transcript, session_id: currentSession }
    fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = data.response ?? 'Извините, произошла ошибка'
        addMessage('assistant', reply)

        if (!currentSession) {
          // when first message creates session
          setCurrentSession(data.session_id)
          setSessions((prev) => {
            const exists = prev.find((s) => s.id === data.session_id)
            if (exists) return prev
            return [{ id: data.session_id, created_at: new Date().toISOString() }, ...prev]
          })
        }
        
        // Speak the reply
        speak(reply)
      })
      .catch(() => {
        const errMsg = 'Ошибка связи с сервером'
        addMessage('assistant', errMsg)
        speak(errMsg)
      })
  }

  const startListening = () => {
    // Stop any ongoing speech when starting to listen
    window.speechSynthesis.cancel()
    
    if (!('webkitSpeechRecognition' in window)) {
      alert('SpeechRecognition API не поддерживается вашим браузером')
      return
    }

    setIsListening(true)
    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript
      handleResult(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Auto scroll chat to bottom when messages update
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="app">
      <div className="sidebar">
        <button className="new-chat-btn" onClick={createNewSession}>
          <FiPlus className="icon" /> Новый чат
        </button>
        
        <div className="sessions-list">
          {sessions.map((s) => (
            <div 
              key={s.id} 
              className={`session-item ${s.id === currentSession ? 'active' : ''}`} 
              onClick={() => loadSession(s.id)}
            >
              <FiMessageCircle className="icon" /> 
              <span className="session-title">Чат #{s.id}</span>
              <span className="session-date">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <header className="app-header">
          <h1>Голосовой ассистент</h1>
        </header>
        
        <div className="chat-container">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <h2>Начните новый разговор</h2>
                <p>Нажмите на кнопку микрофона, чтобы начать говорить</p>
              </div>
            )}
            
            {messages.map((m, idx) => (
              <div key={idx} className={`message ${m.role}`}>
                <div className="message-content">{m.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <div className="input-area">
            <button 
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={startListening}
              disabled={isListening}
            >
              <FiMic className="icon" />
              {isListening ? 'Слушаю...' : 'Нажмите чтобы говорить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App