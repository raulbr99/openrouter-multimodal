'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/openrouter';
import MarkdownRenderer from './MarkdownRenderer';
import { useModels } from '@/contexts/ModelsContext';

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

interface ChatMessage extends Message {
  reasoning?: string;
}

export default function ChatComponent({ conversationId, onConversationCreated }: Props) {
  const { getModelsForCategory } = useModels();
  const chatModels = getModelsForCategory('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(chatModels[0] || 'openai/gpt-4o');
  const [webSearchMode, setWebSearchMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parámetros de generación
  const [temperature, setTemperature] = useState(1);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined);
  const [reasoning, setReasoning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>({});

  // Detecta si el mensaje necesita búsqueda web
  const needsWebSearch = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();

    // Palabras clave que indican necesidad de información actual
    const webSearchKeywords = [
      // Temporal
      'hoy', 'ayer', 'ahora', 'actual', 'actualmente', 'reciente', 'últim', 'nuevo',
      'today', 'yesterday', 'now', 'current', 'currently', 'recent', 'latest', 'new',
      '2024', '2025', '2026',
      // Noticias y eventos
      'noticia', 'news', 'evento', 'event', 'pasó', 'happened', 'sucedió',
      // Precios y datos en tiempo real
      'precio', 'price', 'cotización', 'bolsa', 'stock', 'bitcoin', 'crypto', 'dólar', 'euro',
      // Clima
      'clima', 'weather', 'temperatura', 'pronóstico', 'forecast',
      // Deportes
      'partido', 'match', 'resultado', 'score', 'ganó', 'won', 'perdió', 'lost',
      // Búsqueda explícita
      'busca', 'search', 'encuentra', 'find', 'investiga', 'google',
      // Preguntas sobre estado actual
      'quién es el presidente', 'who is the president', 'quién ganó', 'who won',
      'cuánto cuesta', 'how much', 'cuál es el precio', 'what is the price',
      'qué pasó', 'what happened', 'últimas noticias', 'breaking news',
    ];

    return webSearchKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Cargar conversación existente
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })));
        setModel(data.model);
        setCurrentConversationId(id);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createConversation = async (firstMessage: string) => {
    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, model }),
      });
      const data = await res.json();
      setCurrentConversationId(data.id);
      onConversationCreated?.(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    try {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Crear conversación si es la primera
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(input);
    }

    // Guardar mensaje del usuario
    if (convId) {
      await saveMessage(convId, 'user', input);
    }

    try {
      // Determinar si usar búsqueda web
      const useWebSearch = webSearchMode === 'on' ||
        (webSearchMode === 'auto' && needsWebSearch(input));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: useWebSearch ? `${model}:online` : model,
          temperature,
          maxTokens,
          reasoning,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en la respuesta');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantReasoning = '';

      // Add empty assistant message that we'll update
      setMessages([...newMessages, { role: 'assistant', content: '', reasoning: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
            }
            if (parsed.reasoning) {
              assistantReasoning += parsed.reasoning;
            }
            setMessages([...newMessages, {
              role: 'assistant',
              content: assistantContent,
              reasoning: assistantReasoning
            }]);
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Guardar respuesta del asistente
      if (convId && assistantContent) {
        await saveMessage(convId, 'assistant', assistantContent);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Error al obtener respuesta.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xl font-medium mb-2">¿En qué puedo ayudarte?</p>
            <p className="text-sm">Selecciona un modelo y escribe tu mensaje</p>
          </div>
        ) : (
          <div className="py-6 px-4 space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse max-w-[80%]' : 'w-full'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`text-sm ${
                      msg.role === 'user'
                        ? 'rounded-2xl px-4 py-3 bg-purple-600 text-white rounded-br-md'
                        : 'flex-1 text-gray-900 dark:text-gray-100 pt-1'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content as string}</p>
                    ) : (msg.content as string) || msg.reasoning ? (
                      <div>
                        {/* Reasoning block */}
                        {msg.reasoning && (
                          <div className="mb-3">
                            <button
                              onClick={() => setShowReasoning(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-2"
                            >
                              <svg className={`w-3 h-3 transition-transform ${showReasoning[idx] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Pensamiento del modelo
                            </button>
                            {showReasoning[idx] && (
                              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                                {msg.reasoning}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Main content */}
                        {(msg.content as string) && (
                          <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
                            <MarkdownRenderer content={msg.content as string} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1 py-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="appearance-none px-3 py-3 pr-8 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
              >
                {chatModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId.split('/').pop()}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                const modes: Array<'auto' | 'on' | 'off'> = ['auto', 'on', 'off'];
                const currentIndex = modes.indexOf(webSearchMode);
                setWebSearchMode(modes[(currentIndex + 1) % 3]);
              }}
              className={`p-3 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium ${
                webSearchMode === 'on'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : webSearchMode === 'auto'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
              }`}
              title={
                webSearchMode === 'auto' ? 'Web: Automático (detecta cuándo buscar)' :
                webSearchMode === 'on' ? 'Web: Siempre activado' : 'Web: Desactivado'
              }
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              {webSearchMode === 'auto' ? 'Auto' : webSearchMode === 'on' ? 'On' : 'Off'}
            </button>
            {/* Settings button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-xl transition-all ${
                  showSettings
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-purple-300'
                }`}
                title="Configuración"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              {/* Settings panel */}
              {showSettings && (
                <div className="absolute bottom-full mb-2 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-10">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Configuración</h3>

                  {/* Temperature */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <label className="text-gray-600 dark:text-gray-400">Temperatura</label>
                      <span className="text-gray-900 dark:text-white font-medium">{temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Preciso</span>
                      <span>Creativo</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <label className="text-gray-600 dark:text-gray-400">Longitud máxima</label>
                      <span className="text-gray-900 dark:text-white font-medium">{maxTokens || 'Auto'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4096"
                      step="256"
                      value={maxTokens || 0}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value) || undefined)}
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Auto</span>
                      <span>4096 tokens</span>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Mostrar razonamiento</label>
                      <p className="text-xs text-gray-400">Ver proceso de pensamiento</p>
                    </div>
                    <button
                      onClick={() => setReasoning(!reasoning)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        reasoning ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          reasoning ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Escribe tu mensaje..."
                className="w-full p-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                title="Nueva conversación"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
