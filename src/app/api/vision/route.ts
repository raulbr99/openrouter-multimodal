import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imageBase64, prompt, model = 'openai/gpt-4o' } = await request.json();

    const imageContent = imageBase64
      ? `data:image/jpeg;base64,${imageBase64}`
      : imageUrl;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt || 'Describe esta imagen en detalle.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageContent,
            },
          },
        ],
      },
    ];

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
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
