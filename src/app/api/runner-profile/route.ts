import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runnerProfile } from '@/lib/db/schema';

// GET - Obtener perfil (solo hay uno por ahora)
export async function GET() {
  try {
    const profiles = await db.select().from(runnerProfile).limit(1);

    if (profiles.length === 0) {
      // Crear perfil vacío si no existe
      const [newProfile] = await db.insert(runnerProfile).values({}).returning();
      return NextResponse.json(newProfile);
    }

    return NextResponse.json(profiles[0]);
  } catch (error) {
    console.error('Error fetching runner profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

// PUT - Actualizar perfil
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Obtener el perfil existente o crear uno nuevo
    const profiles = await db.select().from(runnerProfile).limit(1);

    if (profiles.length === 0) {
      // Crear nuevo perfil
      const [newProfile] = await db
        .insert(runnerProfile)
        .values({
          name: body.name || null,
          age: body.age || null,
          weight: body.weight || null,
          height: body.height || null,
          yearsRunning: body.yearsRunning || null,
          weeklyKm: body.weeklyKm || null,
          pb5k: body.pb5k || null,
          pb10k: body.pb10k || null,
          pbHalfMarathon: body.pbHalfMarathon || null,
          pbMarathon: body.pbMarathon || null,
          currentGoal: body.currentGoal || null,
          targetRace: body.targetRace || null,
          targetDate: body.targetDate || null,
          targetTime: body.targetTime || null,
          injuries: body.injuries || null,
          healthNotes: body.healthNotes || null,
          preferredTerrain: body.preferredTerrain || null,
          availableDays: body.availableDays || null,
          maxTimePerSession: body.maxTimePerSession || null,
          coachNotes: body.coachNotes || null,
          additionalInfo: body.additionalInfo || null,
        })
        .returning();
      return NextResponse.json(newProfile);
    }

    // Actualizar perfil existente
    const [updated] = await db
      .update(runnerProfile)
      .set({
        name: body.name !== undefined ? body.name : profiles[0].name,
        age: body.age !== undefined ? body.age : profiles[0].age,
        weight: body.weight !== undefined ? body.weight : profiles[0].weight,
        height: body.height !== undefined ? body.height : profiles[0].height,
        yearsRunning: body.yearsRunning !== undefined ? body.yearsRunning : profiles[0].yearsRunning,
        weeklyKm: body.weeklyKm !== undefined ? body.weeklyKm : profiles[0].weeklyKm,
        pb5k: body.pb5k !== undefined ? body.pb5k : profiles[0].pb5k,
        pb10k: body.pb10k !== undefined ? body.pb10k : profiles[0].pb10k,
        pbHalfMarathon: body.pbHalfMarathon !== undefined ? body.pbHalfMarathon : profiles[0].pbHalfMarathon,
        pbMarathon: body.pbMarathon !== undefined ? body.pbMarathon : profiles[0].pbMarathon,
        currentGoal: body.currentGoal !== undefined ? body.currentGoal : profiles[0].currentGoal,
        targetRace: body.targetRace !== undefined ? body.targetRace : profiles[0].targetRace,
        targetDate: body.targetDate !== undefined ? body.targetDate : profiles[0].targetDate,
        targetTime: body.targetTime !== undefined ? body.targetTime : profiles[0].targetTime,
        injuries: body.injuries !== undefined ? body.injuries : profiles[0].injuries,
        healthNotes: body.healthNotes !== undefined ? body.healthNotes : profiles[0].healthNotes,
        preferredTerrain: body.preferredTerrain !== undefined ? body.preferredTerrain : profiles[0].preferredTerrain,
        availableDays: body.availableDays !== undefined ? body.availableDays : profiles[0].availableDays,
        maxTimePerSession: body.maxTimePerSession !== undefined ? body.maxTimePerSession : profiles[0].maxTimePerSession,
        coachNotes: body.coachNotes !== undefined ? body.coachNotes : profiles[0].coachNotes,
        additionalInfo: body.additionalInfo !== undefined ? body.additionalInfo : profiles[0].additionalInfo,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating runner profile:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}

// PATCH - Actualizar solo las notas del coach (para uso interno del AI)
export async function PATCH(request: NextRequest) {
  try {
    const { coachNotes } = await request.json();

    const profiles = await db.select().from(runnerProfile).limit(1);

    if (profiles.length === 0) {
      const [newProfile] = await db
        .insert(runnerProfile)
        .values({ coachNotes })
        .returning();
      return NextResponse.json(newProfile);
    }

    // Append to existing notes
    const existingNotes = profiles[0].coachNotes || '';
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n---\n\n${coachNotes}`
      : coachNotes;

    const [updated] = await db
      .update(runnerProfile)
      .set({
        coachNotes: updatedNotes,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating coach notes:', error);
    return NextResponse.json({ error: 'Error al actualizar notas' }, { status: 500 });
  }
}
