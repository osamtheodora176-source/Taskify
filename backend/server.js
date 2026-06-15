require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const connectionString = process.env.DATABASE_URL.replace("?sslmode=require", "");
const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

// Initialize DB
async function initDB() {
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dora_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dora_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES dora_users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(50) DEFAULT 'medium',
      task_type VARCHAR(50) DEFAULT 'simple',
      due_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Database initialized");
}
initDB().catch(console.error);

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO dora_users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: "Username already exists" });
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  
  try {
    const { rows } = await pool.query("SELECT * FROM dora_users WHERE username = $1", [username]);
    const user = rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, avatar_url: user.avatar_url }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, avatar_url: user.avatar_url } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile Route
app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  const { password, avatar_url } = req.body;
  try {
    let query = "UPDATE dora_users SET avatar_url = COALESCE($1, avatar_url)";
    let values = [avatar_url];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password_hash = $2";
      values.push(hashedPassword);
    }
    
    query += " WHERE id = $" + (values.length + 1) + " RETURNING id, username, avatar_url";
    values.push(req.user.id);
    
    const { rows } = await pool.query(query, values);
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, avatar_url: user.avatar_url }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tasks for user
app.get("/api/todos", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM dora_tasks WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new task
app.post("/api/todos", authenticateToken, async (req, res) => {
  const { title, description, priority, taskType, dueTime } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  try {
    const { rows } = await pool.query(
      "INSERT INTO dora_tasks (user_id, title, description, status, priority, task_type, due_time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [req.user.id, title, description, "pending", priority || "medium", taskType || "simple", dueTime || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update task
app.put("/api/todos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, taskType, dueTime } = req.body;

  try {
    const { rows } = await pool.query(
      "UPDATE dora_tasks SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status), priority = COALESCE($4, priority), task_type = COALESCE($5, task_type), due_time = COALESCE($6, due_time) WHERE id = $7 AND user_id = $8 RETURNING *",
      [title, description, status, priority, taskType, dueTime, id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE task
app.delete("/api/todos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM dora_tasks WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
