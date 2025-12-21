import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET - Obtener conversación con mensajes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({
      ...conversation[0],
      messages: conversationMessages,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Error al obtener conversación' }, { status: 500 });
  }
}

// PUT - Actualizar conversación (título)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title } = await request.json();

    const [updated] = await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Error al actualizar conversación' }, { status: 500 });
  }
}
