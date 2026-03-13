const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, date DATE,
        budget INTEGER DEFAULT 0, category TEXT DEFAULT 'cultural',
        status TEXT DEFAULT 'upcoming', description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY, member_name TEXT NOT NULL, event_id TEXT,
        amount INTEGER DEFAULT 0, date DATE, status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY, event_id TEXT, title TEXT NOT NULL,
        amount INTEGER DEFAULT 0, date DATE, category TEXT DEFAULT 'other',
        note TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gallery (
        id TEXT PRIMARY KEY, event_id TEXT, title TEXT NOT NULL,
        emoji TEXT DEFAULT '🎭', color TEXT DEFAULT '#d4a012',
        date DATE, created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("DB tables ready");
    await seedIfEmpty(client);
  } finally { client.release(); }
}

async function seedIfEmpty(client) {
  const check = await client.query("SELECT COUNT(*) FROM events");
  if (parseInt(check.rows[0].count) > 0) return;
  const evts = [
    ["e1","Shivaji Maharaj Jayanti 2025","2025-02-19",55000,"cultural","upcoming","Grand celebration of Chhatrapati Shivaji Maharaj's birth anniversary"],
    ["e2","Ganesh Utsav Celebration","2025-09-01",40000,"religious","upcoming","Annual Ganpati festival with cultural programs"],
    ["e3","Kalakriti Art Exhibition","2025-03-15",25000,"art","upcoming","Annual art and craft showcase by group members"],
    ["e4","Diwali Cultural Night","2024-10-20",30000,"cultural","completed","Grand cultural evening with Lavani and Powada performances"],
  ];
  for (const [id,name,date,budget,category,status,description] of evts)
    await client.query(`INSERT INTO events (id,name,date,budget,category,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,[id,name,date,budget,category,status,description]);
  const cos = [
    ["c1","Suresh Shinde","e1",3000,"2025-01-10","paid"],
    ["c2","Priya Jadhav","e1",3000,"2025-01-12","paid"],
    ["c3","Anil More","e1",3000,null,"pending"],
    ["c4","Sunita Pawar","e1",3000,null,"pending"],
    ["c5","Ravi Bhosale","e2",2000,"2025-01-15","paid"],
    ["c6","Suresh Shinde","e4",1500,"2024-10-05","paid"],
    ["c7","Priya Jadhav","e4",1500,"2024-10-07","paid"],
  ];
  for (const [id,member_name,event_id,amount,date,status] of cos)
    await client.query(`INSERT INTO contributions (id,member_name,event_id,amount,date,status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[id,member_name,event_id,amount,date,status]);
  const exs = [
    ["x1","e1","Decoration & Flowers",12000,"2025-01-20","decor","Marigold garlands"],
    ["x2","e1","Sound System",8000,"2025-01-22","equipment","PA system rental"],
    ["x3","e2","Ganesh Idol",15000,"2025-08-20","religious","Eco-friendly idol"],
    ["x4","e4","Stage & Lighting",10000,"2024-10-10","decor","Professional stage setup"],
    ["x5","e4","Catering",8000,"2024-10-20","food","Dinner for 150 guests"],
  ];
  for (const [id,event_id,title,amount,date,category,note] of exs)
    await client.query(`INSERT INTO expenses (id,event_id,title,amount,date,category,note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,[id,event_id,title,amount,date,category,note]);
  const gals = [
    ["g1","e4","Diwali Stage Performance","🪔","#b45309","2024-10-20"],
    ["g2","e4","Award Ceremony","🏅","#1e6b3c","2024-10-20"],
    ["g3","e1","Maharaj Jayanti Planning","⚔️","#8b0000","2025-01-10"],
  ];
  for (const [id,event_id,title,emoji,color,date] of gals)
    await client.query(`INSERT INTO gallery (id,event_id,title,emoji,color,date) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[id,event_id,title,emoji,color,date]);
  console.log("Default data seeded");
}

const d = r => ({ ...r, date: r.date ? r.date.toISOString().slice(0,10) : null });

// EVENTS
app.get("/api/events", async (req,res) => { try { const r = await pool.query("SELECT * FROM events ORDER BY date DESC"); res.json(r.rows.map(d)); } catch(e) { res.status(500).json({error:e.message}); }});
app.post("/api/events", async (req,res) => { try { const {id,name,date,budget,category,status,description} = req.body; const r = await pool.query(`INSERT INTO events (id,name,date,budget,category,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET name=$2,date=$3,budget=$4,category=$5,status=$6,description=$7 RETURNING *`,[id,name,date,budget,category,status,description]); res.json(d(r.rows[0])); } catch(e) { res.status(500).json({error:e.message}); }});
app.delete("/api/events", async (req,res) => { try { await pool.query("DELETE FROM events WHERE id=$1",[req.query.id]); res.json({deleted:req.query.id}); } catch(e) { res.status(500).json({error:e.message}); }});

// CONTRIBUTIONS
app.get("/api/contributions", async (req,res) => { try { const r = await pool.query("SELECT * FROM contributions ORDER BY created_at DESC"); res.json(r.rows.map(row=>({id:row.id,memberName:row.member_name,eventId:row.event_id,amount:row.amount,status:row.status,date:row.date?row.date.toISOString().slice(0,10):null}))); } catch(e) { res.status(500).json({error:e.message}); }});
app.post("/api/contributions", async (req,res) => { try { const {id,memberName,eventId,amount,date,status} = req.body; const r = await pool.query(`INSERT INTO contributions (id,member_name,event_id,amount,date,status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET member_name=$2,event_id=$3,amount=$4,date=$5,status=$6 RETURNING *`,[id,memberName,eventId,amount,date||null,status]); const row=r.rows[0]; res.json({id:row.id,memberName:row.member_name,eventId:row.event_id,amount:row.amount,status:row.status,date:row.date?row.date.toISOString().slice(0,10):null}); } catch(e) { res.status(500).json({error:e.message}); }});
app.put("/api/contributions", async (req,res) => { try { const today=new Date().toISOString().slice(0,10); const r = await pool.query(`UPDATE contributions SET status='paid',date=$1 WHERE id=$2 RETURNING *`,[today,req.query.id]); const row=r.rows[0]; res.json({id:row.id,memberName:row.member_name,eventId:row.event_id,amount:row.amount,status:row.status,date:row.date?row.date.toISOString().slice(0,10):null}); } catch(e) { res.status(500).json({error:e.message}); }});
app.delete("/api/contributions", async (req,res) => { try { await pool.query("DELETE FROM contributions WHERE id=$1",[req.query.id]); res.json({deleted:req.query.id}); } catch(e) { res.status(500).json({error:e.message}); }});

// EXPENSES
app.get("/api/expenses", async (req,res) => { try { const r = await pool.query("SELECT * FROM expenses ORDER BY date DESC"); res.json(r.rows.map(row=>({id:row.id,eventId:row.event_id,title:row.title,amount:row.amount,category:row.category,note:row.note,date:row.date?row.date.toISOString().slice(0,10):null}))); } catch(e) { res.status(500).json({error:e.message}); }});
app.post("/api/expenses", async (req,res) => { try { const {id,eventId,title,amount,date,category,note} = req.body; const r = await pool.query(`INSERT INTO expenses (id,event_id,title,amount,date,category,note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET event_id=$2,title=$3,amount=$4,date=$5,category=$6,note=$7 RETURNING *`,[id,eventId,title,amount,date||null,category,note]); const row=r.rows[0]; res.json({id:row.id,eventId:row.event_id,title:row.title,amount:row.amount,category:row.category,note:row.note,date:row.date?row.date.toISOString().slice(0,10):null}); } catch(e) { res.status(500).json({error:e.message}); }});
app.delete("/api/expenses", async (req,res) => { try { await pool.query("DELETE FROM expenses WHERE id=$1",[req.query.id]); res.json({deleted:req.query.id}); } catch(e) { res.status(500).json({error:e.message}); }});

// GALLERY
app.get("/api/gallery", async (req,res) => { try { const r = await pool.query("SELECT * FROM gallery ORDER BY date DESC"); res.json(r.rows.map(row=>({id:row.id,eventId:row.event_id,title:row.title,emoji:row.emoji,color:row.color,date:row.date?row.date.toISOString().slice(0,10):null}))); } catch(e) { res.status(500).json({error:e.message}); }});
app.post("/api/gallery", async (req,res) => { try { const {id,eventId,title,emoji,color,date} = req.body; const r = await pool.query(`INSERT INTO gallery (id,event_id,title,emoji,color,date) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET event_id=$2,title=$3,emoji=$4,color=$5,date=$6 RETURNING *`,[id,eventId,title,emoji,color,date||null]); const row=r.rows[0]; res.json({id:row.id,eventId:row.event_id,title:row.title,emoji:row.emoji,color:row.color,date:row.date?row.date.toISOString().slice(0,10):null}); } catch(e) { res.status(500).json({error:e.message}); }});
app.delete("/api/gallery", async (req,res) => { try { await pool.query("DELETE FROM gallery WHERE id=$1",[req.query.id]); res.json({deleted:req.query.id}); } catch(e) { res.status(500).json({error:e.message}); }});

// Serve React
app.use(express.static(path.join(__dirname,"../client/build")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"../client/build/index.html")));

app.listen(PORT, async () => {
  console.log("Shivtej Group running on port " + PORT);
  if (process.env.DATABASE_URL) await initDB().catch(console.error);
  else console.warn("No DATABASE_URL set - DB disabled");
});
