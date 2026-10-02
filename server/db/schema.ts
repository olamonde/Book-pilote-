import { pgTable, text, timestamp, integer, boolean, bigint, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar').notNull().default('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
  plan: text('plan').notNull().default('free'), // 'free' | 'creator' | 'pro'
  billingCycle: text('billing_cycle').notNull().default('monthly'), // 'monthly' | 'yearly'
  aiGenerationsUsed: integer('ai_generations_used').notNull().default(0),
  aiGenerationsLimit: integer('ai_generations_limit').notNull().default(5),
  hasCompletedOnboarding: boolean('has_completed_onboarding').notNull().default(false),
  interfaceLanguage: text('interface_language').default('fr'),
  defaultContentLanguage: text('default_content_language'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
  // Store the SHA-256 hash of the sessionId for enhanced security
  sessionHash: text('session_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull()
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_expires_at_idx').on(table.expiresAt)
]);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
