'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, GripHorizontal } from 'lucide-react'
import { http } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/context/UserContext'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'bot'
  content: string
}

const MIN_WIDTH = 300
const MIN_HEIGHT = 350
const MAX_WIDTH = 700
const MAX_HEIGHT = 800
const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 500

export function Chatbot() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Hello! I am TradeUp AI. How can I help you with your portfolio or stock predictions today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Resize state
  const [chatSize, setChatSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const isResizing = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Fetch session and history on chat open
  useEffect(() => {
    if (isOpen && !sessionId && user) {
      const initSession = async () => {
        setIsLoading(true)
        try {
          const sessionRes = await http.post<{ sessionId: number }>('/chatbot/session', {})
          setSessionId(sessionRes.sessionId)
          
          const historyRes = await http.get<{ messages: any[] }>(`/chatbot/history/${sessionRes.sessionId}`)
          if (historyRes.messages && historyRes.messages.length > 0) {
            const mappedHistory: Message[] = historyRes.messages.map((m: any) => ({
              role: (m.role.toLowerCase() === 'user' ? 'user' : 'bot') as 'user' | 'bot',
              content: m.content
            }))
            setMessages(mappedHistory)
          }
        } catch (error) {
          console.error('Failed to init session', error)
        } finally {
          setIsLoading(false)
        }
      }
      initSession()
    }
  }, [isOpen, sessionId, user])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    if (!sessionId) {
      console.error('Session not initialized')
      setMessages(prev => [...prev, { role: 'bot', content: 'Session not initialized. Please try reopening the chat.' }])
      return
    }

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      const res = await http.post<{ response: string }>('/chatbot/chat', { 
        sessionId,
        message: userMsg 
      })
      setMessages(prev => [...prev, { role: 'bot', content: res.response }])
    } catch (error) {
      console.error('Chatbot error:', error)
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent drag when clicking the button or input
  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
  }

  // ─── Resize handlers (top-left corner drag) ───
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    resizeStart.current = { x: clientX, y: clientY, w: chatSize.width, h: chatSize.height }

    const handleResizeMove = (ev: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return
      const cx = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX
      const cy = 'touches' in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY
      // Dragging top-left: moving left increases width, moving up increases height
      const dw = resizeStart.current.x - cx
      const dh = resizeStart.current.y - cy
      setChatSize({
        width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStart.current.w + dw)),
        height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStart.current.h + dh)),
      })
    }

    const handleResizeEnd = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.removeEventListener('touchmove', handleResizeMove)
      document.removeEventListener('touchend', handleResizeEnd)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    document.addEventListener('touchmove', handleResizeMove, { passive: false })
    document.addEventListener('touchend', handleResizeEnd)
  }, [chatSize])

  return (
    <div className="fixed z-[9999] pointer-events-none inset-0">
      <motion.div
        drag
        dragMomentum={false}
        className="pointer-events-auto absolute bottom-8 right-8"
        initial={{ x: 0, y: 0 }}
      >
        {/* Chat Window Container */}
        <div className="relative">
          {/* Draggable Icon / Handle */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
              onPointerDown={stopPropagation}
              className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer transition-colors hover:bg-primary/90"
            >
              {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </motion.button>
            
            {/* Drag Handle hint */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-secondary/80 backdrop-blur-sm rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <GripHorizontal size={10} className="text-muted-foreground" />
              <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wider">Drag</span>
            </div>
          </div>

          {/* Chat Window */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                onPointerDown={stopPropagation}
                style={{ width: chatSize.width, height: chatSize.height }}
                className="absolute bottom-20 right-0 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Resize handle — top-left corner */}
                <div
                  onMouseDown={handleResizeStart}
                  onTouchStart={handleResizeStart}
                  className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 group/resize"
                  title="Drag to resize"
                >
                  <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-muted-foreground/30 group-hover/resize:border-primary rounded-tl-sm transition-colors" />
                </div>

                {/* Header */}
                <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary-foreground/20 p-1.5 rounded-lg">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">TradeUp AI Advisor</h3>
                      <p className="text-[10px] opacity-70">Powered by Gemini</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-1 hover:bg-primary-foreground/20 rounded-md transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 bg-background/50 space-y-4 scroll-smooth"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        m.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                        m.role === 'user' ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                      )}>
                        {m.role === 'user' ? (user?.username?.[0]?.toUpperCase() || 'U') : 'AI'}
                      </div>
                      <div className={cn(
                        "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        m.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm" 
                          : "bg-muted text-foreground rounded-tl-none border border-border/50 shadow-sm"
                      )}>
                        {m.content.split('\n').map((line, idx) => (
                          <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 flex-row animate-pulse">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                        AI
                      </div>
                      <div className="bg-muted text-foreground rounded-2xl rounded-tl-none px-4 py-3 text-sm">
                        <div className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-card border-t border-border flex-shrink-0">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative flex items-center"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask for advice or predictions..."
                      disabled={isLoading}
                      className="pr-10 bg-background/50 border-border/50 focus-visible:ring-primary h-11 text-sm rounded-xl"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost"
                      disabled={isLoading || !input.trim()} 
                      className="absolute right-1 text-primary hover:text-primary/80 hover:bg-transparent"
                    >
                      <Send size={18} />
                    </Button>
                  </form>
                  <p className="text-[9px] text-center text-muted-foreground mt-2">
                    AI can make mistakes. Verify important info.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
