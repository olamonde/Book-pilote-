import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { eq, lte, and } from 'drizzle-orm';
import { db, isPostgresConfigured } from '../db/index.ts';
import { users as usersTable, sessions as sessionsTable, UserRow } from '../db/schema.ts';
import { UserAccount, SessionData } from '../types/auth.ts';
import { User, Plan } from '../../src/types/index.ts';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  create(account: UserAccount): Promise<UserAccount>;
  updateProfile(userId: string, partialProfile: Partial<User>): Promise<UserAccount | null>;
  updatePassword(userId: string, newPasswordHash: string): Promise<boolean>;
}

export interface ISessionRepository {
  createSession(sessionId: string, userId: string, ttlMs: number): Promise<SessionData>;
  getSession(sessionId: string): Promise<SessionData | null>;
  deleteSession(sessionId: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
}

// Security: Hash session tokens with SHA-256 before persisting in DB
export function hashSessionId(sessionId: string): string {
  return crypto.createHash('sha256').update(sessionId).digest('hex');
}

// Helper to convert DB user row to UserAccount
function mapUserRowToAccount(row: UserRow): UserAccount {
  const profile: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    plan: row.plan as Plan,
    billingCycle: (row.billingCycle === 'yearly' ? 'yearly' : 'monthly'),
    aiGenerationsUsed: row.aiGenerationsUsed,
    aiGenerationsLimit: row.aiGenerationsLimit,
    hasCompletedOnboarding: row.hasCompletedOnboarding,
    interfaceLanguage: (row.interfaceLanguage as 'fr' | 'en' | 'es' | 'pt') || 'fr',
    defaultContentLanguage: row.defaultContentLanguage || undefined,
    createdAt: row.createdAt.toISOString()
  };

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    profile
  };
}

// ----------------------------------------------------
// 1. PostgreSQL User Repository Implementation
// ----------------------------------------------------
export class PostgresUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserAccount | null> {
    if (!db) return null;
    const normalized = email.toLowerCase().trim();
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
    if (!rows.length) return null;
    return mapUserRowToAccount(rows[0]);
  }

  async findById(id: string): Promise<UserAccount | null> {
    if (!db) return null;
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!rows.length) return null;
    return mapUserRowToAccount(rows[0]);
  }

  async create(account: UserAccount): Promise<UserAccount> {
    if (!db) throw new Error('Database connection is not initialized');
    const p = account.profile;
    await db.insert(usersTable).values({
      id: account.id,
      email: account.email.toLowerCase().trim(),
      passwordHash: account.passwordHash,
      name: p.name,
      avatar: p.avatar,
      plan: p.plan,
      billingCycle: p.billingCycle,
      aiGenerationsUsed: p.aiGenerationsUsed,
      aiGenerationsLimit: p.aiGenerationsLimit,
      hasCompletedOnboarding: p.hasCompletedOnboarding,
      interfaceLanguage: p.interfaceLanguage || 'fr',
      defaultContentLanguage: p.defaultContentLanguage || null
    });
    return account;
  }

  async updateProfile(userId: string, partialProfile: Partial<User>): Promise<UserAccount | null> {
    if (!db) return null;
    const updateValues: Record<string, any> = {
      updatedAt: new Date()
    };

    if (partialProfile.name !== undefined) updateValues.name = partialProfile.name;
    if (partialProfile.avatar !== undefined) updateValues.avatar = partialProfile.avatar;
    if (partialProfile.plan !== undefined) updateValues.plan = partialProfile.plan;
    if (partialProfile.billingCycle !== undefined) updateValues.billingCycle = partialProfile.billingCycle;
    if (partialProfile.aiGenerationsUsed !== undefined) updateValues.aiGenerationsUsed = partialProfile.aiGenerationsUsed;
    if (partialProfile.aiGenerationsLimit !== undefined) updateValues.aiGenerationsLimit = partialProfile.aiGenerationsLimit;
    if (partialProfile.hasCompletedOnboarding !== undefined) updateValues.hasCompletedOnboarding = partialProfile.hasCompletedOnboarding;
    if (partialProfile.interfaceLanguage !== undefined) updateValues.interfaceLanguage = partialProfile.interfaceLanguage;
    if (partialProfile.defaultContentLanguage !== undefined) updateValues.defaultContentLanguage = partialProfile.defaultContentLanguage;

    const rows = await db
      .update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!rows.length) return null;
    return mapUserRowToAccount(rows[0]);
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<boolean> {
    if (!db) return false;
    const rows = await db
      .update(usersTable)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id });
    return rows.length > 0;
  }
}

// ----------------------------------------------------
// 2. PostgreSQL Session Repository Implementation
// ----------------------------------------------------
export class PostgresSessionRepository implements ISessionRepository {
  async createSession(sessionId: string, userId: string, ttlMs: number): Promise<SessionData> {
    if (!db) throw new Error('Database connection is not initialized');
    const now = Date.now();
    const expiresAt = now + ttlMs;
    const sessionHash = hashSessionId(sessionId);

    // Clean up any expired sessions opportunistically
    await db.delete(sessionsTable).where(lte(sessionsTable.expiresAt, now)).catch(() => {});

    await db.insert(sessionsTable).values({
      sessionHash,
      userId,
      createdAt: now,
      expiresAt
    });

    return {
      sessionId,
      userId,
      createdAt: now,
      expiresAt
    };
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!db) return null;
    const sessionHash = hashSessionId(sessionId);
    const now = Date.now();

    const rows = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.sessionHash, sessionHash)))
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    if (row.expiresAt < now) {
      await db.delete(sessionsTable).where(eq(sessionsTable.sessionHash, sessionHash)).catch(() => {});
      return null;
    }

    return {
      sessionId,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!db) return;
    const sessionHash = hashSessionId(sessionId);
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionHash, sessionHash)).catch(() => {});
  }

  async deleteUserSessions(userId: string): Promise<void> {
    if (!db) return;
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId)).catch(() => {});
  }
}

// ----------------------------------------------------
// 3. Fallback Local JSON Repositories (for dev without DB)
// ----------------------------------------------------
const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

const memoryFileCache = new Map<string, any>();

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (memoryFileCache.has(filePath)) {
    return memoryFileCache.get(filePath) as T;
  }
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as T;
    memoryFileCache.set(filePath, parsed);
    return parsed;
  } catch (err) {
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  memoryFileCache.set(filePath, data);
  try {
    ensureDataDir();
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // In serverless / worker environments without writable disk, in-memory cache is used
  }
}

export class JsonUserRepository implements IUserRepository {
  private loadUsers(): Record<string, UserAccount> {
    return readJsonFile<Record<string, UserAccount>>(USERS_FILE, {});
  }

  private saveUsers(users: Record<string, UserAccount>): void {
    writeJsonFile(USERS_FILE, users);
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const users = this.loadUsers();
    const normalized = email.toLowerCase().trim();
    for (const id in users) {
      if (users[id].email.toLowerCase().trim() === normalized) {
        return users[id];
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    const users = this.loadUsers();
    return users[id] || null;
  }

  async create(account: UserAccount): Promise<UserAccount> {
    const users = this.loadUsers();
    users[account.id] = account;
    this.saveUsers(users);
    return account;
  }

  async updateProfile(userId: string, partialProfile: Partial<User>): Promise<UserAccount | null> {
    const users = this.loadUsers();
    const user = users[userId];
    if (!user) return null;

    user.profile = {
      ...user.profile,
      ...partialProfile,
      id: user.id,
      email: user.email
    };
    user.updatedAt = new Date().toISOString();
    users[userId] = user;
    this.saveUsers(users);
    return user;
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<boolean> {
    const users = this.loadUsers();
    const user = users[userId];
    if (!user) return false;

    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date().toISOString();
    users[userId] = user;
    this.saveUsers(users);
    return true;
  }
}

export class JsonSessionRepository implements ISessionRepository {
  private loadSessions(): Record<string, SessionData> {
    const sessions = readJsonFile<Record<string, SessionData>>(SESSIONS_FILE, {});
    const now = Date.now();
    let hasExpired = false;
    for (const key in sessions) {
      if (sessions[key].expiresAt < now) {
        delete sessions[key];
        hasExpired = true;
      }
    }
    if (hasExpired) {
      this.saveSessions(sessions);
    }
    return sessions;
  }

  private saveSessions(sessions: Record<string, SessionData>): void {
    writeJsonFile(SESSIONS_FILE, sessions);
  }

  async createSession(sessionId: string, userId: string, ttlMs: number): Promise<SessionData> {
    const sessions = this.loadSessions();
    const now = Date.now();
    const sessionData: SessionData = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt: now + ttlMs
    };
    // Store under hashed session key for consistency
    const sessionHash = hashSessionId(sessionId);
    sessions[sessionHash] = sessionData;
    this.saveSessions(sessions);
    return sessionData;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const sessions = this.loadSessions();
    const sessionHash = hashSessionId(sessionId);
    const session = sessions[sessionHash] || sessions[sessionId];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete sessions[sessionHash];
      delete sessions[sessionId];
      this.saveSessions(sessions);
      return null;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = this.loadSessions();
    const sessionHash = hashSessionId(sessionId);
    delete sessions[sessionHash];
    delete sessions[sessionId];
    this.saveSessions(sessions);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const sessions = this.loadSessions();
    let changed = false;
    for (const key in sessions) {
      if (sessions[key].userId === userId) {
        delete sessions[key];
        changed = true;
      }
    }
    if (changed) {
      this.saveSessions(sessions);
    }
  }
}

// ----------------------------------------------------
// 4. Hybrid Factory / Switch
// ----------------------------------------------------
export class HybridUserRepository implements IUserRepository {
  private postgres = new PostgresUserRepository();
  private fallback = new JsonUserRepository();

  private getActiveRepo(): IUserRepository {
    return isPostgresConfigured() && db ? this.postgres : this.fallback;
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    return this.getActiveRepo().findByEmail(email);
  }

  async findById(id: string): Promise<UserAccount | null> {
    return this.getActiveRepo().findById(id);
  }

  async create(account: UserAccount): Promise<UserAccount> {
    return this.getActiveRepo().create(account);
  }

  async updateProfile(userId: string, partialProfile: Partial<User>): Promise<UserAccount | null> {
    return this.getActiveRepo().updateProfile(userId, partialProfile);
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<boolean> {
    return this.getActiveRepo().updatePassword(userId, newPasswordHash);
  }
}

export class HybridSessionRepository implements ISessionRepository {
  private postgres = new PostgresSessionRepository();
  private fallback = new JsonSessionRepository();

  private getActiveRepo(): ISessionRepository {
    return isPostgresConfigured() && db ? this.postgres : this.fallback;
  }

  async createSession(sessionId: string, userId: string, ttlMs: number): Promise<SessionData> {
    return this.getActiveRepo().createSession(sessionId, userId, ttlMs);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.getActiveRepo().getSession(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.getActiveRepo().deleteSession(sessionId);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    return this.getActiveRepo().deleteUserSessions(userId);
  }
}

export const userRepository: IUserRepository = new HybridUserRepository();
export const sessionRepository: ISessionRepository = new HybridSessionRepository();
