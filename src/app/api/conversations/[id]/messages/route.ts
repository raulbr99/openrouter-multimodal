import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST - Agregar mensaje a conversación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { role, content } = await request.json();

    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId: id,
        role,
        content,
      })
      .returning();

    // Actualizar timestamp de la conversación
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Error al agregar mensaje' }, { status: 500 });
  }
}
