require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace("?sslmode=require", ""),
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pool.query(`ALTER TABLE dora_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    console.log("Migration successful: Added avatar_url to dora_users");
  } catch (e) {
    console.error("Migration failed:", e.message);
  } finally {
    process.exit(0);
  }
}

migrate();
