import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export const initDb = async () => {
    const client = await pool.connect();
    try {
        // Create Users Table (UUID-based)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Create Events Table (UUID-based, matching init.sql)
        await client.query(`
            CREATE TABLE IF NOT EXISTS events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                description TEXT,
                location TEXT,
                city TEXT NOT NULL DEFAULT 'Global',
                category TEXT NOT NULL DEFAULT 'General',
                tags TEXT[],
                image_url TEXT,
                start_time TIMESTAMPTZ NOT NULL,
                end_time TIMESTAMPTZ,
                creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
                source TEXT,
                external_id TEXT UNIQUE,
                lat DOUBLE PRECISION,
                lng DOUBLE PRECISION,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Create Device Tokens Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS device_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL,
                platform TEXT DEFAULT 'unknown',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, token)
            );
        `);

        // Create Registrations Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS registrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                event_id UUID REFERENCES events(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'attending',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, event_id)
            );
        `);

        // Add missing columns if they don't exist (migration support)
        await client.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Global',
            ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General',
            ADD COLUMN IF NOT EXISTS tags TEXT[],
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS source TEXT,
            ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
            ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE CASCADE;
        `);

        // Create indexes for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
            CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
            CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
            CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id);
        `);

        // Create system user if it doesn't exist (for automated event creation)
        await client.query(`
            INSERT INTO users (id, email, password_hash, full_name)
            VALUES ('00000000-0000-0000-0000-000000000000', 'system@eventapp.com', '$2b$10$dummyhashfornologin', 'System User')
            ON CONFLICT (id) DO NOTHING;
        `);

        console.log('✅ Database initialized and verified (UUID-based schema)');
    } catch (err: any) {
        console.error('❌ Database initialization error:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

export default pool;
