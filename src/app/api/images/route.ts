import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatedImages } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET - Obtener todas las imágenes generadas
export async function GET() {
  try {
    const images = await db
      .select()
      .from(generatedImages)
      .orderBy(desc(generatedImages.createdAt));

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Error al obtener imágenes' }, { status: 500 });
  }
}

// POST - Guardar imagen generada
export async function POST(request: NextRequest) {
  try {
    const { prompt, model, imageUrl } = await request.json();

    const [newImage] = await db
      .insert(generatedImages)
      .values({ prompt, model, imageUrl })
      .returning();

    return NextResponse.json(newImage);
  } catch (error) {
    console.error('Error saving image:', error);
    return NextResponse.json({ error: 'Error al guardar imagen' }, { status: 500 });
  }
}
