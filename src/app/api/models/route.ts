import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Error al obtener modelos' },
      { status: 500 }
    );
  }
}
