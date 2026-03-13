// server.js — Express backend for Render deployment
// Serves React frontend + all API routes

const express = require("express");
const path    = require("path");
const { Pool } = require("pg");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ── Initialize tables
async function initDB() {
  const client = await pool.connect();
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
        event_id    TEXT,
        amount      INTEGER DEFAULT 0,
        date        DATE,
        status      TEXT DEFAULT 'pending',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id          TEXT PRIMARY KEY,
        event_id    TEXT,
        title       TEXT NOT NULL,
        amount      INTEGER DEFAULT 0,
        date        DATE,
        category    TEXT DEFAULT 'other',
        note        TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gallery (
        id          TEXT PRIMARY KEY,
        event_id    TEXT,
        title       TEXT NOT NULL,
        emoji       TEXT DEFAULT '🎭',
        color       TEXT DEFAULT '#d4a012',
        date        DATE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ Database tables ready");
  } finally {
    client.release();
  }
}

// ── Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ══════════════════════════ API ROUTES ══════════════════════════

// EVENTS
app.get("/api/events", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM events ORDER BY date DESC");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/events", async (req, res) => {
  try {
    const { id, name, date, budget, category, status, description } = req.body;
    const r = await pool.query(
      `INSERT INTO events (id,name,date,budget,category,status,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET name=$2,date=$3,budget=$4,category=$5,status=$6,description=$7
       RETURNING *`,
      [id, name, date||null, budget, category, status, description]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/events", async (req, res) => {
  try {
    const { id } = req.query;
    await pool.query("DELETE FROM events WHERE id=$1", [id]);
    res.json({ deleted: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CONTRIBUTIONS
app.get("/api/contributions", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM contributions ORDER BY created_at DESC");
    res.json(r.rows.map(row => ({
      id: row.id, memberName: row.member_name, eventId: row.event_id,
      amount: row.amount, date: row.date?.toISOString().slice(0,10)||null, status: row.status
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/contributions", async (req, res) => {
  try {
    const { id, memberName, eventId, amount, date, status } = req.body;
    const r = await pool.query(
      `INSERT INTO contributions (id,member_name,event_id,amount,date,status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET member_name=$2,event_id=$3,amount=$4,date=$5,status=$6
       RETURNING *`,
      [id, memberName, eventId, amount, date||null, status]
    );
    const row = r.rows[0];
    res.json({ id:row.id, memberName:row.member_name, eventId:row.event_id, amount:row.amount, date:row.date?.toISOString().slice(0,10)||null, status:row.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/contributions", async (req, res) => {
  try {
    const { id } = req.query;
    const today = new Date().toISOString().slice(0,10);
    const r = await pool.query(
      "UPDATE contributions SET status='paid', date=$1 WHERE id=$2 RETURNING *",
      [today, id]
    );
    const row = r.rows[0];
    res.json({ id:row.id, memberName:row.member_name, eventId:row.event_id, amount:row.amount, date:row.date?.toISOString().slice(0,10)||null, status:row.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/contributions", async (req, res) => {
  try {
    const { id } = req.query;
    await pool.query("DELETE FROM contributions WHERE id=$1", [id]);
    res.json({ deleted: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// EXPENSES
app.get("/api/expenses", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM expenses ORDER BY date DESC");
    res.json(r.rows.map(row => ({
      id:row.id, eventId:row.event_id, title:row.title,
      amount:row.amount, date:row.date?.toISOString().slice(0,10)||null,
      category:row.category, note:row.note
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const { id, eventId, title, amount, date, category, note } = req.body;
    const r = await pool.query(
      `INSERT INTO expenses (id,event_id,title,amount,date,category,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET event_id=$2,title=$3,amount=$4,date=$5,category=$6,note=$7
       RETURNING *`,
      [id, eventId, title, amount, date||null, category, note]
    );
    const row = r.rows[0];
    res.json({ id:row.id, eventId:row.event_id, title:row.title, amount:row.amount, date:row.date?.toISOString().slice(0,10)||null, category:row.category, note:row.note });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/expenses", async (req, res) => {
  try {
    const { id } = req.query;
    await pool.query("DELETE FROM expenses WHERE id=$1", [id]);
    res.json({ deleted: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GALLERY
app.get("/api/gallery", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM gallery ORDER BY date DESC");
    res.json(r.rows.map(row => ({
      id:row.id, eventId:row.event_id, title:row.title,
      emoji:row.emoji, color:row.color, date:row.date?.toISOString().slice(0,10)||null
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gallery", async (req, res) => {
  try {
    const { id, eventId, title, emoji, color, date } = req.body;
    const r = await pool.query(
      `INSERT INTO gallery (id,event_id,title,emoji,color,date)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET event_id=$2,title=$3,emoji=$4,color=$5,date=$6
       RETURNING *`,
      [id, eventId, title, emoji, color, date||null]
    );
    const row = r.rows[0];
    res.json({ id:row.id, eventId:row.event_id, title:row.title, emoji:row.emoji, color:row.color, date:row.date?.toISOString().slice(0,10)||null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/gallery", async (req, res) => {
  try {
    const { id } = req.query;
    await pool.query("DELETE FROM gallery WHERE id=$1", [id]);
    res.json({ deleted: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SEED
app.get("/api/seed", async (req, res) => {
  try {
    const check = await pool.query("SELECT COUNT(*) FROM events");
    if (parseInt(check.rows[0].count) > 0) {
      return res.json({ message: "Already seeded", count: check.rows[0].count });
    }
    const DEF_EVTS = [
      { id:"e1", name:"Shivaji Maharaj Jayanti 2025", date:"2025-02-19", budget:55000, category:"cultural", status:"upcoming", description:"Grand celebration of Chhatrapati Shivaji Maharaj's birth anniversary" },
      { id:"e2", name:"Ganesh Utsav Celebration", date:"2025-09-01", budget:40000, category:"religious", status:"upcoming", description:"Annual Ganpati festival with cultural programs" },
      { id:"e3", name:"Kalakriti Art Exhibition", date:"2025-03-15", budget:25000, category:"art", status:"upcoming", description:"Annual art and craft showcase" },
      { id:"e4", name:"Diwali Cultural Night", date:"2024-10-20", budget:30000, category:"cultural", status:"completed", description:"Grand cultural evening with Lavani and Powada" },
    ];
    for (const e of DEF_EVTS) {
      await pool.query(
        `INSERT INTO events (id,name,date,budget,category,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [e.id,e.name,e.date,e.budget,e.category,e.status,e.description]
      );
    }
    const DEF_CO = [
      { id:"c1", memberName:"Suresh Shinde",  eventId:"e1", amount:3000, date:"2025-01-10", status:"paid" },
      { id:"c2", memberName:"Priya Jadhav",   eventId:"e1", amount:3000, date:"2025-01-12", status:"paid" },
      { id:"c3", memberName:"Anil More",      eventId:"e1", amount:3000, date:null,         status:"pending" },
      { id:"c4", memberName:"Sunita Pawar",   eventId:"e1", amount:3000, date:null,         status:"pending" },
      { id:"c5", memberName:"Ravi Bhosale",   eventId:"e2", amount:2000, date:"2025-01-15", status:"paid" },
      { id:"c6", memberName:"Suresh Shinde",  eventId:"e4", amount:1500, date:"2024-10-05", status:"paid" },
      { id:"c7", memberName:"Priya Jadhav",   eventId:"e4", amount:1500, date:"2024-10-07", status:"paid" },
    ];
    for (const c of DEF_CO) {
      await pool.query(
        `INSERT INTO contributions (id,member_name,event_id,amount,date,status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [c.id,c.memberName,c.eventId,c.amount,c.date||null,c.status]
      );
    }
    const DEF_EX = [
      { id:"x1", eventId:"e1", title:"Decoration & Flowers", amount:12000, date:"2025-01-20", category:"decor",     note:"Marigold garlands" },
      { id:"x2", eventId:"e1", title:"Sound System",         amount:8000,  date:"2025-01-22", category:"equipment", note:"PA system rental" },
      { id:"x3", eventId:"e2", title:"Ganesh Idol",          amount:15000, date:"2025-08-20", category:"religious", note:"Eco-friendly idol" },
      { id:"x4", eventId:"e4", title:"Stage & Lighting",     amount:10000, date:"2024-10-10", category:"decor",     note:"Professional stage" },
      { id:"x5", eventId:"e4", title:"Catering",             amount:8000,  date:"2024-10-20", category:"food",      note:"Dinner for 150 guests" },
    ];
    for (const x of DEF_EX) {
      await pool.query(
        `INSERT INTO expenses (id,event_id,title,amount,date,category,note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [x.id,x.eventId,x.title,x.amount,x.date||null,x.category,x.note]
      );
    }
    const DEF_GAL = [
      { id:"g1", eventId:"e4", title:"Diwali Stage Performance", emoji:"🪔", color:"#b45309", date:"2024-10-20" },
      { id:"g2", eventId:"e4", title:"Award Ceremony",           emoji:"🏅", color:"#1e6b3c", date:"2024-10-20" },
      { id:"g3", eventId:"e1", title:"Maharaj Jayanti Planning", emoji:"⚔️", color:"#8b0000", date:"2025-01-10" },
    ];
    for (const g of DEF_GAL) {
      await pool.query(
        `INSERT INTO gallery (id,event_id,title,emoji,color,date) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [g.id,g.eventId,g.title,g.emoji,g.color,g.date||null]
      );
    }
    res.json({ message: "Seeded successfully!" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Serve React frontend (production build)
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// ── Start server
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Shivtej Group running on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ DB init failed:", err.message);
    process.exit(1);
  });
