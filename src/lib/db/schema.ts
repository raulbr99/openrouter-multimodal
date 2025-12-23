import { pgTable, text, timestamp, uuid, jsonb, date, real, integer } from 'drizzle-orm/pg-core';

// Conversaciones de chat
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('Nueva conversación'),
  model: text('model').notNull(),
  category: text('category').default('general'), // 'general' | 'running'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Mensajes de cada conversación
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Imágenes generadas
export const generatedImages = pgTable('generated_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  prompt: text('prompt').notNull(),
  model: text('model').notNull(),
  imageUrl: text('image_url').notNull(), // URL o base64
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Análisis de visión
export const visionAnalyses = pgTable('vision_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageUrl: text('image_url').notNull(),
  prompt: text('prompt'),
  model: text('model').notNull(),
  response: text('response').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Perfil de corredor (memoria persistente)
export const runnerProfile = pgTable('runner_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Datos personales
  name: text('name'),
  age: integer('age'),
  weight: real('weight'), // kg
  height: integer('height'), // cm
  // Experiencia
  yearsRunning: integer('years_running'),
  weeklyKm: real('weekly_km'), // km/semana habitual
  // Marcas personales
  pb5k: text('pb_5k'), // formato "20:30"
  pb10k: text('pb_10k'),
  pbHalfMarathon: text('pb_half_marathon'),
  pbMarathon: text('pb_marathon'),
  // Objetivos
  currentGoal: text('current_goal'), // objetivo actual
  targetRace: text('target_race'), // carrera objetivo
  targetDate: date('target_date'), // fecha objetivo
  targetTime: text('target_time'), // tiempo objetivo
  // Salud y limitaciones
  injuries: text('injuries'), // lesiones pasadas/actuales
  healthNotes: text('health_notes'), // notas de salud
  // Preferencias
  preferredTerrain: text('preferred_terrain'), // asfalto, trail, mixto
  availableDays: text('available_days'), // días disponibles para entrenar
  maxTimePerSession: integer('max_time_per_session'), // minutos
  // Notas adicionales del entrenador AI
  coachNotes: text('coach_notes'), // notas que el AI guarda sobre el usuario
  // Información adicional flexible (JSONB)
  additionalInfo: jsonb('additional_info').$type<Record<string, unknown>>(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Eventos de running
export const runningEvents = pgTable('running_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  category: text('category').default('running').notNull(), // 'running' | 'personal'
  type: text('type').notNull(), // running: 'easy' | 'tempo' | etc. personal: 'event' | 'appointment' | 'task' | etc.
  title: text('title'), // para eventos personales
  time: text('time'), // hora del evento "14:30"
  distance: real('distance'), // km
  duration: integer('duration'), // minutos
  pace: text('pace'), // min/km formato "5:30"
  notes: text('notes'),
  heartRate: integer('heart_rate'), // bpm promedio
  feeling: integer('feeling'), // 1-5
  completed: integer('completed').default(0), // 0 = planificado, 1 = completado
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types para TypeScript
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type GeneratedImage = typeof generatedImages.$inferSelect;
export type NewGeneratedImage = typeof generatedImages.$inferInsert;
export type VisionAnalysis = typeof visionAnalyses.$inferSelect;
export type NewVisionAnalysis = typeof visionAnalyses.$inferInsert;
export type RunningEvent = typeof runningEvents.$inferSelect;
export type NewRunningEvent = typeof runningEvents.$inferInsert;
export type RunnerProfile = typeof runnerProfile.$inferSelect;
export type NewRunnerProfile = typeof runnerProfile.$inferInsert;
