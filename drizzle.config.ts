import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: connectionString
    ? { url: connectionString }
    : {
        host: process.env.SQL_HOST || 'localhost',
        user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres',
        password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || '',
        database: process.env.SQL_DB_NAME || 'bookpilot',
        ssl: false
      }
});
