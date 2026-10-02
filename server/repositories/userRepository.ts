import fs from 'fs';
import path from 'path';
import { UserAccount, SessionData } from '../types/auth';
import { User } from '../../src/types';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  create(account: UserAccount): Promise<UserAccount>;
  updateProfile(userId: string, partialProfile: Partial<User>): Promise<UserAccount | null>;
}

export interface ISessionRepository {
  createSession(sessionId: string, userId: string, ttlMs: number): Promise<SessionData>;
  getSession(sessionId: string): Promise<SessionData | null>;
  deleteSession(sessionId: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[Repository] Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[Repository] Error writing ${filePath}:`, err);
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
      // Ensure immutable core identity fields stay intact
      id: user.id,
      email: user.email
    };
    user.updatedAt = new Date().toISOString();
    users[userId] = user;
    this.saveUsers(users);
    return user;
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
    sessions[sessionId] = sessionData;
    this.saveSessions(sessions);
    return sessionData;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const sessions = this.loadSessions();
    const session = sessions[sessionId];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete sessions[sessionId];
      this.saveSessions(sessions);
      return null;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = this.loadSessions();
    if (sessions[sessionId]) {
      delete sessions[sessionId];
      this.saveSessions(sessions);
    }
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

export const userRepository = new JsonUserRepository();
export const sessionRepository = new JsonSessionRepository();
