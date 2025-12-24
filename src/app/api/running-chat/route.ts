import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile, runningEvents } from '@/lib/db/schema';
import { and, gte, lte, desc } from 'drizzle-orm';

// Definición del tool para guardar perfil
const saveProfileTool = {
  type: 'function' as const,
  function: {
    name: 'save_runner_profile',
    description: 'Guarda o actualiza información del perfil del corredor. Usa este tool cuando el usuario comparta datos personales, marcas, objetivos, lesiones, o cualquier información relevante sobre su perfil como corredor.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del corredor' },
        age: { type: 'number', description: 'Edad en años' },
        weight: { type: 'number', description: 'Peso en kg' },
        height: { type: 'number', description: 'Altura en cm' },
        yearsRunning: { type: 'number', description: 'Años de experiencia corriendo' },
        weeklyKm: { type: 'number', description: 'Kilómetros semanales habituales' },
        pb5k: { type: 'string', description: 'Marca personal 5K (formato MM:SS)' },
        pb10k: { type: 'string', description: 'Marca personal 10K' },
        pbHalfMarathon: { type: 'string', description: 'Marca personal media maratón' },
        pbMarathon: { type: 'string', description: 'Marca personal maratón' },
        currentGoal: { type: 'string', description: 'Objetivo actual del corredor' },
        targetRace: { type: 'string', description: 'Carrera objetivo' },
        targetTime: { type: 'string', description: 'Tiempo objetivo para la carrera' },
        injuries: { type: 'string', description: 'Lesiones pasadas o actuales' },
        healthNotes: { type: 'string', description: 'Notas de salud relevantes' },
        preferredTerrain: { type: 'string', description: 'Terreno preferido (asfalto, trail, mixto)' },
        availableDays: { type: 'string', description: 'Días disponibles para entrenar' },
        maxTimePerSession: { type: 'number', description: 'Tiempo máximo por sesión en minutos' },
        coachNotes: { type: 'string', description: 'Notas importantes sobre el corredor' },
        additionalInfo: {
          type: 'object',
          description: 'Información adicional que no encaja en otros campos (zapatillas, equipamiento, rutinas, etc.)',
          additionalProperties: true
        },
      },
      required: [],
    },
  },
};

// Tool para obtener eventos
const getEventsTool = {
  type: 'function' as const,
  function: {
    name: 'get_running_events',
    description: 'Obtiene los eventos y entrenamientos del calendario del corredor. Usa este tool cuando el usuario pregunte por sus entrenamientos, eventos planificados, o quiera ver su calendario.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Fecha de inicio en formato YYYY-MM-DD (opcional, por defecto últimos 30 días)' },
        endDate: { type: 'string', description: 'Fecha de fin en formato YYYY-MM-DD (opcional, por defecto hoy + 30 días)' },
        category: { type: 'string', enum: ['running', 'personal', 'all'], description: 'Categoría de eventos a obtener (por defecto: all)' },
        limit: { type: 'number', description: 'Límite de eventos a obtener (por defecto: 20)' },
      },
      required: [],
    },
  },
};

// Tool para crear evento
const createEventTool = {
  type: 'function' as const,
  function: {
    name: 'create_running_event',
    description: 'Crea un nuevo evento o entrenamiento en el calendario. Usa este tool cuando el usuario quiera planificar un entrenamiento, añadir una carrera, o crear cualquier evento relacionado con running.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha del evento en formato YYYY-MM-DD (requerido)' },
        category: { type: 'string', enum: ['running', 'personal'], description: 'Categoría: running para entrenamientos, personal para otros eventos' },
        type: {
          type: 'string',
          description: 'Tipo de evento. Para running: easy (rodaje), tempo, interval (series), long (tirada larga), recovery (recuperación), race (carrera), strength (fuerza), rest (descanso). Para personal: event, appointment, task, reminder, birthday, meeting'
        },
        title: { type: 'string', description: 'Título del evento (para carreras o eventos personales)' },
        time: { type: 'string', description: 'Hora del evento en formato HH:MM (opcional)' },
        distance: { type: 'number', description: 'Distancia en kilómetros (para entrenamientos)' },
        duration: { type: 'number', description: 'Duración en minutos' },
        pace: { type: 'string', description: 'Ritmo objetivo en formato M:SS (ej: 5:30)' },
        notes: { type: 'string', description: 'Notas adicionales sobre el entrenamiento' },
      },
      required: ['date', 'type'],
    },
  },
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
}

// Función para ejecutar el tool y guardar el perfil
async function executeProfileSave(args: Record<string, unknown>) {
  try {
    const profiles = await db.select().from(runnerProfile).limit(1);

    // Preparar datos para actualizar
    const updateData: Record<string, unknown> = {};

    const stringFields = ['name', 'pb5k', 'pb10k', 'pbHalfMarathon', 'pbMarathon',
      'currentGoal', 'targetRace', 'targetTime', 'injuries', 'healthNotes',
      'preferredTerrain', 'availableDays', 'coachNotes'];
    const numberFields = ['age', 'weight', 'height', 'yearsRunning', 'weeklyKm', 'maxTimePerSession'];

    for (const field of stringFields) {
      if (args[field] !== undefined) {
        updateData[field] = args[field];
      }
    }

    for (const field of numberFields) {
      if (args[field] !== undefined) {
        updateData[field] = Number(args[field]);
      }
    }

    // Manejar additionalInfo (merge con existente)
    if (args.additionalInfo) {
      const existingInfo = profiles[0]?.additionalInfo as Record<string, unknown> || {};
      updateData.additionalInfo = { ...existingInfo, ...(args.additionalInfo as Record<string, unknown>) };
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: 'No hay datos para actualizar' };
    }

    updateData.updatedAt = new Date();

    if (profiles.length === 0) {
      // Crear nuevo perfil
      await db.insert(runnerProfile).values(updateData);
    } else {
      // Actualizar perfil existente
      await db.update(runnerProfile).set(updateData);
    }

    return { success: true, message: 'Perfil actualizado correctamente' };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { success: false, message: 'Error al guardar el perfil' };
  }
}

// Función para obtener eventos
async function executeGetEvents(args: Record<string, unknown>) {
  try {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const startDate = (args.startDate as string) || defaultStart.toISOString().split('T')[0];
    const endDate = (args.endDate as string) || defaultEnd.toISOString().split('T')[0];
    const category = (args.category as string) || 'all';
    const limit = (args.limit as number) || 20;

    let query = db
      .select()
      .from(runningEvents)
      .where(
        and(
          gte(runningEvents.date, startDate),
          lte(runningEvents.date, endDate)
        )
      )
      .orderBy(runningEvents.date)
      .limit(limit);

    const events = await query;

    // Filtrar por categoría si no es 'all'
    const filteredEvents = category === 'all'
      ? events
      : events.filter(e => e.category === category);

    return {
      success: true,
      events: filteredEvents.map(e => ({
        id: e.id,
        date: e.date,
        category: e.category,
        type: e.type,
        title: e.title,
        time: e.time,
        distance: e.distance,
        duration: e.duration,
        pace: e.pace,
        notes: e.notes,
        completed: e.completed === 1,
      })),
      count: filteredEvents.length,
    };
  } catch (error) {
    console.error('Error getting events:', error);
    return { success: false, message: 'Error al obtener eventos', events: [] };
  }
}

// Función para crear evento
async function executeCreateEvent(args: Record<string, unknown>) {
  try {
    const [event] = await db
      .insert(runningEvents)
      .values({
        date: args.date as string,
        category: (args.category as string) || 'running',
        type: args.type as string,
        title: (args.title as string) || null,
        time: (args.time as string) || null,
        distance: args.distance ? Number(args.distance) : null,
        duration: args.duration ? Number(args.duration) : null,
        pace: (args.pace as string) || null,
        notes: (args.notes as string) || null,
        completed: 0,
      })
      .returning();

    return {
      success: true,
      message: 'Evento creado correctamente',
      event: {
        id: event.id,
        date: event.date,
        category: event.category,
        type: event.type,
        title: event.title,
        distance: event.distance,
        duration: event.duration,
      },
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, message: 'Error al crear evento' };
  }
}

// Ejecutar tool según nombre
async function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'save_runner_profile':
      return executeProfileSave(args);
    case 'get_running_events':
      return executeGetEvents(args);
    case 'create_running_event':
      return executeCreateEvent(args);
    default:
      return { success: false, message: `Tool desconocido: ${name}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      messages,
      model = 'openai/gpt-4o',
      temperature = 0.7,
    }: ChatRequest = await request.json();

    const requestBody = {
      model,
      messages,
      temperature,
      tools: [saveProfileTool, getEventsTool, createEventTool],
      tool_choice: 'auto',
      stream: true,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OpenRouter Running Coach',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper para procesar stream
    async function processStream(
      reader: ReadableStreamDefaultReader<Uint8Array>,
      controller: ReadableStreamDefaultController<Uint8Array>,
      collectToolCall: boolean
    ): Promise<{ toolCallId: string; toolCallName: string; toolCallArgs: string; contentBuffer: string } | null> {
      let toolCallId = '';
      let toolCallName = '';
      let toolCallArgs = '';
      let contentBuffer = '';
      let hasToolCall = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              const finishReason = parsed.choices?.[0]?.finish_reason;

              // Detectar tool calls
              if (collectToolCall && delta?.tool_calls) {
                hasToolCall = true;
                for (const tc of delta.tool_calls) {
                  if (tc.id) toolCallId = tc.id;
                  if (tc.function?.name) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                }
              }

              // Contenido normal - enviarlo al cliente
              if (delta?.content) {
                contentBuffer += delta.content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta.content })}\n\n`));
              }

              // Si terminó con tool_calls, retornar los datos
              if (finishReason === 'tool_calls' && hasToolCall) {
                reader.releaseLock();
                return { toolCallId, toolCallName, toolCallArgs, contentBuffer };
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      reader.releaseLock();
      return null;
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          // Procesar primera respuesta
          const toolCallData = await processStream(reader, controller, true);

          // Si hubo tool call, ejecutarlo y hacer segunda llamada
          if (toolCallData && toolCallData.toolCallArgs) {
            try {
              const args = JSON.parse(toolCallData.toolCallArgs);
              const toolResult = await executeTool(toolCallData.toolCallName, args);

              // Notificar al cliente según el tipo de tool
              const notification: Record<string, unknown> = { toolExecuted: toolCallData.toolCallName };
              if (toolCallData.toolCallName === 'save_runner_profile') {
                notification.profileSaved = true;
                notification.savedFields = Object.keys(args);
              } else if (toolCallData.toolCallName === 'create_running_event') {
                notification.eventCreated = true;
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));

              // Hacer segunda llamada al modelo con el resultado del tool
              const continueMessages = [
                ...messages,
                {
                  role: 'assistant',
                  content: toolCallData.contentBuffer || null,
                  tool_calls: [{
                    id: toolCallData.toolCallId,
                    type: 'function',
                    function: { name: toolCallData.toolCallName, arguments: toolCallData.toolCallArgs }
                  }]
                },
                {
                  role: 'tool',
                  tool_call_id: toolCallData.toolCallId,
                  content: JSON.stringify(toolResult)
                }
              ];

              const continueResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'OpenRouter Running Coach',
                },
                body: JSON.stringify({
                  model,
                  messages: continueMessages,
                  temperature,
                  stream: true,
                }),
              });

              if (continueResponse.ok && continueResponse.body) {
                const continueReader = continueResponse.body.getReader();
                await processStream(continueReader, controller, false);
              }
            } catch (e) {
              console.error('Error processing tool call:', e);
            }
          }

          // Enviar done
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Running chat API error:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar la solicitud' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
