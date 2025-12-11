import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, FileText, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface DocumentSession {
  sessionId: string;
  filename: string;
  status: string;
  isLoaded: boolean;
  createdAt: string;
}

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<DocumentSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    searchParams.get('session')
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
      setSearchParams({ session: currentSessionId });
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadSessionMessages = (sessionId: string) => {
    // Reset messages for new session
    const session = sessions.find(s => s.sessionId === sessionId);
    const welcomeMessage: Message = {
      id: '1',
      text: session 
        ? `Hello! I'm ready to answer questions about "${session.filename}". What would you like to know?`
        : "Hello! I'm your document assistant. Please select a document to start chatting.",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await axios.post(`http://localhost:5000/api/chat/${currentSessionId}`, {
        query: inputText
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        setSearchParams({});
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const currentSession = sessions.find(s => s.sessionId === currentSessionId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Document Sessions */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Your Documents</h2>
              
              {sessions.length === 0 ? (
                <p className="text-white/70 text-sm">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        currentSessionId === session.sessionId
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                      onClick={() => setCurrentSessionId(session.sessionId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-white text-sm font-medium truncate">
                              {session.filename}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              session.isLoaded 
                                ? 'bg-green-500/20 text-green-400'
                                : session.status === 'processing'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {session.isLoaded ? 'Ready' : session.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.sessionId);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-white">
                      {currentSession ? currentSession.filename : 'Document Assistant'}
                    </h1>
                    <p className="text-white/70 text-sm">
                      {currentSession 
                        ? currentSession.isLoaded 
                          ? 'Ready to answer your questions'
                          : 'Document is being processed...'
                        : 'Select a document to start chatting'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.sender === 'user' 
                            ? 'bg-gradient-to-r from-emerald-500 to-blue-500'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}>
                          {message.sender === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                            : 'bg-white/20 text-white'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-white/70' : 'text-white/50'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white/20 px-4 py-3 rounded-2xl">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                          <span className="text-white text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-white/20">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        currentSession && currentSession.isLoaded
                          ? "Ask a question about your document..."
                          : "Please select a processed document to start chatting..."
                      }
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={1}
                      disabled={isLoading || !currentSession || !currentSession.isLoaded}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading || !currentSession || !currentSession.isLoaded}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Chat;