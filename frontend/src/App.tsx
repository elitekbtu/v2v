import { useState, useRef } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Paper,
  CircularProgress,
} from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import './App.css'

// Access browser SpeechRecognition implementation
// @ts-ignore
const SpeechRecognition = (window.SpeechRecognition || (window as any).webkitSpeechRecognition)

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const recognitionRef = useRef<any | null>(null)
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev: Message[]) => [...prev, { role, content }])
  }

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ru-RU'
    window.speechSynthesis.speak(utterance)
  }

  const handleResult = (transcript: string) => {
    addMessage('user', transcript)

    // Send to backend
    setLoading(true)
    const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: transcript }),
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = data.response ?? 'Извините, произошла ошибка'
        addMessage('assistant', reply)
        speak(reply)
        setLoading(false)
      })
      .catch(() => {
        const errMsg = 'Ошибка связи с сервером'
        addMessage('assistant', errMsg)
        speak(errMsg)
        setLoading(false)
      })
  }

  const startListening = () => {
    if (!SpeechRecognition) {
      alert('SpeechRecognition API не поддерживается вашим браузером')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript
      handleResult(transcript)
    }

    recognition.onerror = () => {
      alert('Ошибка распознавания речи')
    }

    recognition.onend = () => {
      recognitionRef.current = null
    }

    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  return (
    <Box className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Голосовой ассистент
          </Typography>
        </Toolbar>
      </AppBar>

      <Box className="chat-window">
        {messages.map((m: Message, idx: number) => (
          <Paper
            key={idx}
            className={`message ${m.role}`}
            elevation={1}
            sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            {m.content}
          </Paper>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

      <Box className="controls">
        <IconButton
          color="primary"
          size="large"
          onClick={listening ? stopListening : startListening}
        >
          {listening ? <StopIcon fontSize="large" /> : <MicIcon fontSize="large" />}
        </IconButton>
      </Box>
    </Box>
  )
}

export default App
