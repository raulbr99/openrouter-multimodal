import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runningEvents } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// GET - Obtener eventos (con filtro opcional por mes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let events;

    if (year && month) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;

      events = await db
        .select()
        .from(runningEvents)
        .where(
          and(
            gte(runningEvents.date, startDate),
            lte(runningEvents.date, endDate)
          )
        )
        .orderBy(runningEvents.date);
    } else {
      events = await db
        .select()
        .from(runningEvents)
        .orderBy(runningEvents.date);
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching running events:', error);
    return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 });
  }
}

// POST - Crear evento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [event] = await db
      .insert(runningEvents)
      .values({
        date: body.date,
        category: body.category || 'running',
        type: body.type,
        title: body.title || null,
        time: body.time || null,
        distance: body.distance || null,
        duration: body.duration || null,
        pace: body.pace || null,
        notes: body.notes || null,
        heartRate: body.heartRate || null,
        feeling: body.feeling || null,
        completed: body.completed || 0,
      })
      .returning();

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating running event:', error);
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
  }
}

// PUT - Actualizar evento
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const [event] = await db
      .update(runningEvents)
      .set({
        date: body.date,
        category: body.category || 'running',
        type: body.type,
        title: body.title || null,
        time: body.time || null,
        distance: body.distance || null,
        duration: body.duration || null,
        pace: body.pace || null,
        notes: body.notes || null,
        heartRate: body.heartRate || null,
        feeling: body.feeling || null,
        completed: body.completed,
        updatedAt: new Date(),
      })
      .where(eq(runningEvents.id, body.id))
      .returning();

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating running event:', error);
    return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 });
  }
}

// DELETE - Eliminar evento
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.delete(runningEvents).where(eq(runningEvents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting running event:', error);
    return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 });
  }
}
