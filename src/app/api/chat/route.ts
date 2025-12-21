import { NextRequest } from 'next/server';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const {
      messages,
      model = 'openai/gpt-4o',
      temperature = 1,
      maxTokens,
      reasoning = false
    }: ChatRequest = await request.json();

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: true,
      temperature,
    };

    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    // Añadir reasoning si está activado
    if (reasoning) {
      requestBody.reasoning = { effort: 'medium' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OpenRouter Multimodal App',
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

    // Stream the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

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
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;

                  // Contenido normal
                  if (delta?.content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta.content })}\n\n`));
                  }

                  // Contenido de razonamiento
                  if (delta?.reasoning) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ reasoning: delta.reasoning })}\n\n`));
                  }
                } catch {
                  // Ignore parse errors for comments/keepalives
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
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar la solicitud' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
