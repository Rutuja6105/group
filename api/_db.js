// api/_db.js — shared PostgreSQL connection pool
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Supabase
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Initialize tables if they don't exist
async function initDB() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        date        DATE,
        budget      INTEGER DEFAULT 0,
        category    TEXT DEFAULT 'cultural',
        status      TEXT DEFAULT 'upcoming',
        description TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id          TEXT PRIMARY KEY,
        member_name TEXT NOT NULL,
        event_id    TEXT REFERENCES events(id) ON DELETE CASCADE,
        amount      INTEGER DEFAULT 0,
        date        DATE,
        status      TEXT DEFAULT 'pending',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT PRIMARY KEY,
        event_id    TEXT REFERENCES events(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        amount      INTEGER DEFAULT 0,
        date        DATE,
        category    TEXT DEFAULT 'other',
        note        TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gallery (
        id          TEXT PRIMARY KEY,
        event_id    TEXT REFERENCES events(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        emoji       TEXT DEFAULT '🎭',
        color       TEXT DEFAULT '#d4a012',
        date        DATE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS config (
        key         TEXT PRIMARY KEY,
        value       JSONB NOT NULL,
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

// CORS headers for all API responses
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { getPool, initDB, cors };
