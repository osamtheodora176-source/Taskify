require("dotenv").config({ path: "../../Taskify/Taskify-Dashboard/.env" });
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL.replace("?sslmode=require", "");
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query("DROP TABLE IF EXISTS dora_tasks;");
    console.log("dora_tasks table dropped successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
