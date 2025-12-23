import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile } from '@/lib/db/schema';

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
      tools: [saveProfileTool],
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

    // Acumuladores para tool calls
    let toolCallId = '';
    let toolCallName = '';
    let toolCallArgs = '';
    let isToolCall = false;
    let contentBuffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
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
                if (data === '[DONE]') {
                  // Si hubo tool call, ejecutarlo
                  if (isToolCall && toolCallArgs) {
                    try {
                      const args = JSON.parse(toolCallArgs);
                      const result = await executeProfileSave(args);

                      // Notificar al cliente que se guardó el perfil
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        profileSaved: true,
                        savedFields: Object.keys(args)
                      })}\n\n`));
                    } catch (e) {
                      console.error('Error parsing tool args:', e);
                    }
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  const finishReason = parsed.choices?.[0]?.finish_reason;

                  // Detectar tool calls
                  if (delta?.tool_calls) {
                    isToolCall = true;
                    for (const tc of delta.tool_calls) {
                      if (tc.id) toolCallId = tc.id;
                      if (tc.function?.name) toolCallName = tc.function.name;
                      if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                    }
                  }

                  // Contenido normal
                  if (delta?.content) {
                    contentBuffer += delta.content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta.content })}\n\n`));
                  }

                  // Si finish_reason es tool_calls, procesar el tool
                  if (finishReason === 'tool_calls' && toolCallArgs) {
                    try {
                      const args = JSON.parse(toolCallArgs);
                      const result = await executeProfileSave(args);

                      // Hacer segunda llamada al modelo con el resultado del tool
                      const continueMessages = [
                        ...messages,
                        {
                          role: 'assistant',
                          content: contentBuffer || null,
                          tool_calls: [{
                            id: toolCallId,
                            type: 'function',
                            function: { name: toolCallName, arguments: toolCallArgs }
                          }]
                        },
                        {
                          role: 'tool',
                          tool_call_id: toolCallId,
                          content: JSON.stringify(result)
                        }
                      ];

                      // Segunda llamada para obtener respuesta final
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

                      if (continueResponse.ok) {
                        const continueReader = continueResponse.body?.getReader();
                        if (continueReader) {
                          // Notificar que se guardó el perfil
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            profileSaved: true,
                            savedFields: Object.keys(args)
                          })}\n\n`));

                          while (true) {
                            const { done: contDone, value: contValue } = await continueReader.read();
                            if (contDone) break;

                            const contChunk = decoder.decode(contValue, { stream: true });
                            const contLines = contChunk.split('\n');

                            for (const contLine of contLines) {
                              const contTrimmed = contLine.trim();
                              if (!contTrimmed.startsWith('data: ')) continue;

                              const contData = contTrimmed.slice(6);
                              if (contData === '[DONE]') continue;

                              try {
                                const contParsed = JSON.parse(contData);
                                const contDelta = contParsed.choices?.[0]?.delta;
                                if (contDelta?.content) {
                                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: contDelta.content })}\n\n`));
                                }
                              } catch {
                                // Ignore parse errors
                              }
                            }
                          }
                          continueReader.releaseLock();
                        }
                      }
                    } catch (e) {
                      console.error('Error processing tool call:', e);
                    }
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
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
