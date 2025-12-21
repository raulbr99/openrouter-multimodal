import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'google/gemini-3-pro-image-preview', sourceImage } = await request.json();

    // Construir el contenido del mensaje
    let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

    if (sourceImage) {
      // Modo edición: incluir imagen + prompt
      messageContent = [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${sourceImage}`,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ];
    } else {
      // Modo generación: solo prompt
      messageContent = prompt;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OpenRouter Multimodal App',
      },
      body: JSON.stringify({
        model,
        modalities: ['text', 'image'],
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    // Formato OpenRouter: message.images[].image_url.url
    if (message?.images && message.images.length > 0) {
      const imageUrl = message.images[0]?.image_url?.url;
      if (imageUrl) {
        return NextResponse.json({ data: [{ url: imageUrl }] });
      }
    }

    // Buscar en el contenido si es un array con partes de imagen
    if (Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          return NextResponse.json({ data: [{ url: part.image_url.url }] });
        }
        if (part.inline_data?.data) {
          const mimeType = part.inline_data.mime_type || 'image/png';
          return NextResponse.json({
            data: [{ url: `data:${mimeType};base64,${part.inline_data.data}` }]
          });
        }
      }
    }

    // Buscar data URL en el contenido de texto
    const content = typeof message?.content === 'string' ? message.content : '';
    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) {
      return NextResponse.json({ data: [{ url: base64Match[0] }] });
    }

    return NextResponse.json({
      error: 'No se generó imagen',
      debug: { images: message?.images, content: message?.content }
    }, { status: 400 });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Error al generar la imagen' },
      { status: 500 }
    );
  }
}
