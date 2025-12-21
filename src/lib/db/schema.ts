import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

// Conversaciones de chat
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('Nueva conversación'),
  model: text('model').notNull(),
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

// Types para TypeScript
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type GeneratedImage = typeof generatedImages.$inferSelect;
export type NewGeneratedImage = typeof generatedImages.$inferInsert;
export type VisionAnalysis = typeof visionAnalyses.$inferSelect;
export type NewVisionAnalysis = typeof visionAnalyses.$inferInsert;
