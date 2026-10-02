import { sql, eq } from 'drizzle-orm';
import { db, isPostgresConfigured } from '../db/index.ts';
import { users as usersTable } from '../db/schema.ts';
import { userRepository } from '../repositories/userRepository.ts';
import { User } from '../../src/types/index.ts';

export interface QuotaConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  error?: string;
}

export class QuotaService {
  /**
   * Atomically consumes AI generation quota in PostgreSQL
   * Ensures race-condition proof increment:
   * UPDATE users SET ai_generations_used = ai_generations_used + units
   * WHERE id = userId AND ai_generations_used + units <= ai_generations_limit
   */
  static async consumeAiGeneration(userId: string, units: number = 1): Promise<QuotaConsumeResult> {
    if (units <= 0) {
      units = 1;
    }

    if (isPostgresConfigured() && db) {
      try {
        // Atomic single-query conditional increment
        const result = await db
          .update(usersTable)
          .set({
            aiGenerationsUsed: sql`${usersTable.aiGenerationsUsed} + ${units}`,
            updatedAt: new Date()
          })
          .where(
            sql`${usersTable.id} = ${userId} AND (${usersTable.aiGenerationsUsed} + ${units}) <= ${usersTable.aiGenerationsLimit}`
          )
          .returning({
            id: usersTable.id,
            used: usersTable.aiGenerationsUsed,
            limit: usersTable.aiGenerationsLimit
          });

        if (result && result.length > 0) {
          const row = result[0];
          return {
            allowed: true,
            used: row.used,
            limit: row.limit,
            remaining: Math.max(0, row.limit - row.used)
          };
        }

        // If no rows were returned, quota is exceeded or user not found
        const existing = await db
          .select({ used: usersTable.aiGenerationsUsed, limit: usersTable.aiGenerationsLimit })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1);

        const used = existing[0]?.used ?? 0;
        const limit = existing[0]?.limit ?? 5;

        return {
          allowed: false,
          used,
          limit,
          remaining: Math.max(0, limit - used),
          error: 'AI_QUOTA_EXCEEDED'
        };
      } catch (err) {
        console.error('[QuotaService] Error in atomic consumeAiGeneration:', err);
      }
    }

    // Fallback in-memory / JSON repository handling
    const account = await userRepository.findById(userId);
    if (!account) {
      return { allowed: false, used: 0, limit: 0, remaining: 0, error: 'USER_NOT_FOUND' };
    }

    const currentUsed = account.profile.aiGenerationsUsed || 0;
    const limit = account.profile.aiGenerationsLimit || 5;

    if (currentUsed + units > limit) {
      return {
        allowed: false,
        used: currentUsed,
        limit,
        remaining: Math.max(0, limit - currentUsed),
        error: 'AI_QUOTA_EXCEEDED'
      };
    }

    const newUsed = currentUsed + units;
    await userRepository.updateProfile(userId, { aiGenerationsUsed: newUsed });

    return {
      allowed: true,
      used: newUsed,
      limit,
      remaining: Math.max(0, limit - newUsed)
    };
  }

  /**
   * Atomically refunds unused or failed generations
   */
  static async refundAiGeneration(userId: string, units: number = 1): Promise<void> {
    if (units <= 0) return;

    if (isPostgresConfigured() && db) {
      try {
        await db
          .update(usersTable)
          .set({
            aiGenerationsUsed: sql`GREATEST(0, ${usersTable.aiGenerationsUsed} - ${units})`,
            updatedAt: new Date()
          })
          .where(eq(usersTable.id, userId));
        return;
      } catch (err) {
        console.error('[QuotaService] Error in refundAiGeneration:', err);
      }
    }

    // Fallback
    const account = await userRepository.findById(userId);
    if (account) {
      const current = account.profile.aiGenerationsUsed || 0;
      const newUsed = Math.max(0, current - units);
      await userRepository.updateProfile(userId, { aiGenerationsUsed: newUsed });
    }
  }

  /**
   * Check remaining quota without consuming
   */
  static async checkQuota(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
    if (isPostgresConfigured() && db) {
      try {
        const rows = await db
          .select({ used: usersTable.aiGenerationsUsed, limit: usersTable.aiGenerationsLimit })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1);

        if (rows.length) {
          const used = rows[0].used;
          const limit = rows[0].limit;
          return { used, limit, remaining: Math.max(0, limit - used) };
        }
      } catch (err) {
        console.error('[QuotaService] Error checking quota:', err);
      }
    }

    const account = await userRepository.findById(userId);
    const used = account?.profile.aiGenerationsUsed ?? 0;
    const limit = account?.profile.aiGenerationsLimit ?? 5;
    return { used, limit, remaining: Math.max(0, limit - used) };
  }
}
