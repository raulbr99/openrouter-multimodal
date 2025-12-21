import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visionAnalyses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET - Obtener historial de análisis de visión
export async function GET() {
  try {
    const analyses = await db
      .select()
      .from(visionAnalyses)
      .orderBy(desc(visionAnalyses.createdAt));

    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Error fetching vision history:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}

// POST - Guardar análisis de visión
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, model, response } = await request.json();

    const [newAnalysis] = await db
      .insert(visionAnalyses)
      .values({ imageUrl, prompt, model, response })
      .returning();

    return NextResponse.json(newAnalysis);
  } catch (error) {
    console.error('Error saving vision analysis:', error);
    return NextResponse.json({ error: 'Error al guardar análisis' }, { status: 500 });
  }
}
