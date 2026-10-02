import { User } from '../../src/types';

export interface UserAccount {
  // Authentication & Identity
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  // Domain / Profile state
  profile: User;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}
