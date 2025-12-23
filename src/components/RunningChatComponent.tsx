'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/openrouter';
import MarkdownRenderer from './MarkdownRenderer';
import { useModels } from '@/contexts/ModelsContext';

interface RunnerProfile {
  id: string;
  name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  yearsRunning: number | null;
  weeklyKm: number | null;
  pb5k: string | null;
  pb10k: string | null;
  pbHalfMarathon: string | null;
  pbMarathon: string | null;
  currentGoal: string | null;
  targetRace: string | null;
  targetDate: string | null;
  targetTime: string | null;
  injuries: string | null;
  healthNotes: string | null;
  preferredTerrain: string | null;
  availableDays: string | null;
  maxTimePerSession: number | null;
  coachNotes: string | null;
}

const buildSystemPrompt = (profile: RunnerProfile | null) => {
  let basePrompt = `Eres un entrenador experto en running y un asistente especializado en todo lo relacionado con el mundo del running. Tu conocimiento incluye:

- Planes de entrenamiento personalizados (5K, 10K, media maratón, maratón, trail)
- Técnica de carrera y biomecánica
- Prevención y recuperación de lesiones comunes en corredores
- Nutrición e hidratación para corredores
- Equipamiento (zapatillas, ropa técnica, accesorios)
- Estrategias de carrera y pacing
- Entrenamiento de fuerza complementario
- Recuperación y descanso
- Análisis de ritmos y tiempos
- Preparación mental y motivación

Responde de forma clara, práctica y motivadora. Cuando des planes o consejos, sé específico con tiempos, distancias y ritmos cuando sea apropiado. Si el usuario te comparte datos de sus entrenamientos, analízalos y ofrece feedback constructivo.

Siempre prioriza la salud y seguridad del corredor. Si detectas signos de sobreentrenamiento o lesión potencial, advierte al usuario.

IMPORTANTE: Cuando el usuario te comparta información personal relevante (marcas, objetivos, lesiones, datos físicos, preferencias de entrenamiento), debes incluir al FINAL de tu respuesta un bloque especial con formato:

[GUARDAR_PERFIL]
campo: valor
campo2: valor2
[/GUARDAR_PERFIL]

Los campos disponibles son:
- name: nombre del corredor
- age: edad en años
- weight: peso en kg
- height: altura en cm
- yearsRunning: años corriendo
- weeklyKm: km semanales habituales
- pb5k: marca personal 5K (formato "MM:SS")
- pb10k: marca personal 10K
- pbHalfMarathon: marca personal media maratón
- pbMarathon: marca personal maratón
- currentGoal: objetivo actual
- targetRace: carrera objetivo
- targetTime: tiempo objetivo
- injuries: lesiones (pasadas o actuales)
- healthNotes: notas de salud relevantes
- preferredTerrain: terreno preferido (asfalto/trail/mixto)
- availableDays: días disponibles para entrenar
- maxTimePerSession: tiempo máximo por sesión en minutos
- coachNotes: notas adicionales importantes sobre el corredor

Solo incluye este bloque cuando el usuario proporcione información nueva o actualizada. No lo incluyas en cada respuesta.`;

  // Añadir información del perfil si existe
  if (profile) {
    const profileInfo: string[] = [];

    if (profile.name) profileInfo.push(`Nombre: ${profile.name}`);
    if (profile.age) profileInfo.push(`Edad: ${profile.age} años`);
    if (profile.weight) profileInfo.push(`Peso: ${profile.weight} kg`);
    if (profile.height) profileInfo.push(`Altura: ${profile.height} cm`);
    if (profile.yearsRunning) profileInfo.push(`Experiencia: ${profile.yearsRunning} años corriendo`);
    if (profile.weeklyKm) profileInfo.push(`Volumen semanal habitual: ${profile.weeklyKm} km`);

    const pbs: string[] = [];
    if (profile.pb5k) pbs.push(`5K: ${profile.pb5k}`);
    if (profile.pb10k) pbs.push(`10K: ${profile.pb10k}`);
    if (profile.pbHalfMarathon) pbs.push(`Media maratón: ${profile.pbHalfMarathon}`);
    if (profile.pbMarathon) pbs.push(`Maratón: ${profile.pbMarathon}`);
    if (pbs.length > 0) profileInfo.push(`Marcas personales: ${pbs.join(', ')}`);

    if (profile.currentGoal) profileInfo.push(`Objetivo actual: ${profile.currentGoal}`);
    if (profile.targetRace) profileInfo.push(`Carrera objetivo: ${profile.targetRace}`);
    if (profile.targetDate) profileInfo.push(`Fecha objetivo: ${profile.targetDate}`);
    if (profile.targetTime) profileInfo.push(`Tiempo objetivo: ${profile.targetTime}`);

    if (profile.injuries) profileInfo.push(`Lesiones: ${profile.injuries}`);
    if (profile.healthNotes) profileInfo.push(`Notas de salud: ${profile.healthNotes}`);

    if (profile.preferredTerrain) profileInfo.push(`Terreno preferido: ${profile.preferredTerrain}`);
    if (profile.availableDays) profileInfo.push(`Días disponibles: ${profile.availableDays}`);
    if (profile.maxTimePerSession) profileInfo.push(`Tiempo máximo por sesión: ${profile.maxTimePerSession} minutos`);

    if (profile.coachNotes) profileInfo.push(`Notas del entrenador: ${profile.coachNotes}`);

    if (profileInfo.length > 0) {
      basePrompt += `\n\n--- PERFIL DEL CORREDOR ---\n${profileInfo.join('\n')}\n--- FIN DEL PERFIL ---\n\nUsa esta información para personalizar tus respuestas y dar consejos específicos para este corredor.`;
    }
  }

  return basePrompt;
};

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

export default function RunningChatComponent({ conversationId, onConversationCreated }: Props) {
  const { getModelsForCategory } = useModels();
  const chatModels = getModelsForCategory('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(chatModels[0] || 'openai/gpt-4o');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>({});
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    loadConversations();
    loadProfile();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/runner-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const updateProfile = async (updates: Partial<RunnerProfile>) => {
    try {
      const res = await fetch('/api/runner-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const parseProfileUpdates = (response: string): Partial<RunnerProfile> | null => {
    const match = response.match(/\[GUARDAR_PERFIL\]([\s\S]*?)\[\/GUARDAR_PERFIL\]/);
    if (!match) return null;

    const updates: Record<string, string | number> = {};
    const lines = match[1].trim().split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const cleanKey = key.trim();
        const value = valueParts.join(':').trim();

        // Convert numeric fields
        if (['age', 'weight', 'height', 'yearsRunning', 'weeklyKm', 'maxTimePerSession'].includes(cleanKey)) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            updates[cleanKey] = numValue;
          }
        } else {
          updates[cleanKey] = value;
        }
      }
    }

    return Object.keys(updates).length > 0 ? updates : null;
  };

  const cleanResponse = (response: string): string => {
    return response.replace(/\[GUARDAR_PERFIL\][\s\S]*?\[\/GUARDAR_PERFIL\]/g, '').trim();
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations?category=running');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

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
        body: JSON.stringify({ title, model, category: 'running' }),
      });
      const data = await res.json();
      setCurrentConversationId(data.id);
      onConversationCreated?.(data.id);
      loadConversations();
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

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta conversación?')) return;

    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.id !== id));
      if (currentConversationId === id) {
        clearChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(input);
    }

    if (convId) {
      await saveMessage(convId, 'user', input);
    }

    try {
      const systemPrompt = buildSystemPrompt(profile);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.map(msg => ({ role: msg.role, content: msg.content }))
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en la respuesta');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantReasoning = '';

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
            // Show cleaned response (without profile tags)
            setMessages([...newMessages, {
              role: 'assistant',
              content: cleanResponse(assistantContent),
              reasoning: assistantReasoning
            }]);
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Check for profile updates in the response
      const profileUpdates = parseProfileUpdates(assistantContent);
      if (profileUpdates) {
        await updateProfile(profileUpdates);
      }

      // Save cleaned response
      const cleanedContent = cleanResponse(assistantContent);
      if (convId && cleanedContent) {
        await saveMessage(convId, 'assistant', cleanedContent);
      }

      // Update final message with cleaned content
      setMessages([...newMessages, {
        role: 'assistant',
        content: cleanedContent,
        reasoning: assistantReasoning
      }]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const quickPrompts = [
    { icon: '📋', text: 'Crear plan de entrenamiento', prompt: 'Quiero un plan de entrenamiento para ' },
    { icon: '🏃', text: 'Mejorar mi ritmo', prompt: '¿Cómo puedo mejorar mi ritmo actual de carrera?' },
    { icon: '🤕', text: 'Prevenir lesiones', prompt: '¿Qué ejercicios me recomiendas para prevenir lesiones?' },
    { icon: '🍎', text: 'Nutrición running', prompt: '¿Qué debo comer antes y después de correr?' },
  ];

  const hasProfileData = profile && (profile.name || profile.currentGoal || profile.pb5k || profile.pb10k);

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar de historial */}
      <div className={`${showHistory ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Historial
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin conversaciones</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    currentConversationId === conv.id
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{conv.title}</p>
                    <p className="text-xs opacity-70">{formatDate(conv.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar de perfil */}
      <div className={`${showProfile ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mi Perfil de Corredor
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {profile ? (
            <div className="space-y-4 text-sm">
              {/* Datos personales */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Datos personales</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Nombre:</span> {profile.name || '-'}</p>
                  <p><span className="font-medium">Edad:</span> {profile.age ? `${profile.age} años` : '-'}</p>
                  <p><span className="font-medium">Peso:</span> {profile.weight ? `${profile.weight} kg` : '-'}</p>
                  <p><span className="font-medium">Altura:</span> {profile.height ? `${profile.height} cm` : '-'}</p>
                </div>
              </div>

              {/* Experiencia */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Experiencia</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Años corriendo:</span> {profile.yearsRunning || '-'}</p>
                  <p><span className="font-medium">Km/semana:</span> {profile.weeklyKm || '-'}</p>
                </div>
              </div>

              {/* Marcas */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Marcas personales</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">5K:</span> {profile.pb5k || '-'}</p>
                  <p><span className="font-medium">10K:</span> {profile.pb10k || '-'}</p>
                  <p><span className="font-medium">Media:</span> {profile.pbHalfMarathon || '-'}</p>
                  <p><span className="font-medium">Maratón:</span> {profile.pbMarathon || '-'}</p>
                </div>
              </div>

              {/* Objetivos */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Objetivos</h4>
                <div className="space-y-1 text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Objetivo:</span> {profile.currentGoal || '-'}</p>
                  <p><span className="font-medium">Carrera:</span> {profile.targetRace || '-'}</p>
                  <p><span className="font-medium">Tiempo objetivo:</span> {profile.targetTime || '-'}</p>
                </div>
              </div>

              {/* Salud */}
              {(profile.injuries || profile.healthNotes) && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Salud</h4>
                  <div className="space-y-1 text-gray-600 dark:text-gray-400">
                    {profile.injuries && <p><span className="font-medium">Lesiones:</span> {profile.injuries}</p>}
                    {profile.healthNotes && <p><span className="font-medium">Notas:</span> {profile.healthNotes}</p>}
                  </div>
                </div>
              )}

              {/* Notas del coach */}
              {profile.coachNotes && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Notas del entrenador</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {profile.coachNotes}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400 italic pt-2">
                El perfil se actualiza automáticamente cuando compartes información en el chat.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Cargando perfil...</p>
          )}
        </div>
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
              <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-4xl">🏃</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Running Coach</p>
              <p className="text-sm text-center mb-4 max-w-md">
                Tu entrenador personal de running con IA. Pregúntame sobre planes de entrenamiento, técnica, nutrición, lesiones y más.
              </p>
              {hasProfileData && (
                <div className="mb-6 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Perfil cargado: {profile?.name || 'Corredor'}
                    {profile?.currentGoal && ` - ${profile.currentGoal}`}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {quickPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(item.prompt)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-all text-left"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                  </button>
                ))}
              </div>
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🏃</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`text-sm ${
                        msg.role === 'user'
                          ? 'rounded-2xl px-4 py-3 bg-green-600 text-white rounded-br-md'
                          : 'flex-1 text-gray-900 dark:text-gray-100 pt-1'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content as string}</p>
                      ) : (msg.content as string) || msg.reasoning ? (
                        <div>
                          {msg.reasoning && (
                            <div className="mb-3">
                              <button
                                onClick={() => setShowReasoning(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mb-2"
                              >
                                <svg className={`w-3 h-3 transition-transform ${showReasoning[idx] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Pensamiento del entrenador
                              </button>
                              {showReasoning[idx] && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                                  {msg.reasoning}
                                </div>
                              )}
                            </div>
                          )}
                          {(msg.content as string) && (
                            <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
                              <MarkdownRenderer content={msg.content as string} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1 py-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                onClick={() => { setShowHistory(!showHistory); setShowProfile(false); }}
                className={`p-2.5 sm:p-3 rounded-xl transition-all ${
                  showHistory
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
                title="Historial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                onClick={() => { setShowProfile(!showProfile); setShowHistory(false); }}
                className={`p-2.5 sm:p-3 rounded-xl transition-all ${
                  showProfile
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
                title="Mi Perfil"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-green-400 dark:hover:border-green-500 transition-all shadow-sm"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🏃</span>
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{model.split('/').pop()}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showModelDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)} />
                    <div className="absolute bottom-full mb-2 left-0 w-64 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20">
                      <div className="p-2">
                        <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Modelos</p>
                        {chatModels.map((modelId) => {
                          const isSelected = model === modelId;
                          const provider = modelId.split('/')[0];
                          const modelName = modelId.split('/').pop();
                          return (
                            <button
                              key={modelId}
                              onClick={() => {
                                setModel(modelId);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                              }`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{modelName}</p>
                                <p className="text-xs text-gray-400 truncate">{provider}</p>
                              </div>
                              {isSelected && (
                                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Pregunta sobre running..."
                  className="w-full p-2.5 sm:p-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  className="p-2.5 sm:p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  title="Nueva conversación"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
