import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET - Obtener todas las conversaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = db.select().from(conversations);

    if (category) {
      query = query.where(eq(conversations.category, category)) as typeof query;
    }

    const allConversations = await query.orderBy(desc(conversations.updatedAt));

    return NextResponse.json(allConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Error al obtener conversaciones' }, { status: 500 });
  }
}

// POST - Crear nueva conversación
export async function POST(request: NextRequest) {
  try {
    const { title, model, category } = await request.json();

    const [newConversation] = await db
      .insert(conversations)
      .values({ title, model, category: category || 'general' })
      .returning();

    return NextResponse.json(newConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Error al crear conversación' }, { status: 500 });
  }
}

// DELETE - Eliminar conversación
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.delete(conversations).where(eq(conversations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Error al eliminar conversación' }, { status: 500 });
  }
}
