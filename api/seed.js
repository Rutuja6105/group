// api/seed.js — seeds default data on first run
const { getPool, initDB, cors } = require('./_db');

const DEF_EVTS = [
  { id:"e1", name:"Shivaji Maharaj Jayanti 2025", date:"2025-02-19", budget:55000, category:"cultural", status:"upcoming", description:"Grand celebration of Chhatrapati Shivaji Maharaj's birth anniversary" },
  { id:"e2", name:"Ganesh Utsav Celebration", date:"2025-09-01", budget:40000, category:"religious", status:"upcoming", description:"Annual Ganpati festival with cultural programs" },
  { id:"e3", name:"Kalakriti Art Exhibition", date:"2025-03-15", budget:25000, category:"art", status:"upcoming", description:"Annual art and craft showcase by group members" },
  { id:"e4", name:"Diwali Cultural Night", date:"2024-10-20", budget:30000, category:"cultural", status:"completed", description:"Grand cultural evening with Lavani and Powada performances" },
];
const DEF_CO = [
  { id:"c1", memberName:"Suresh Shinde",  eventId:"e1", amount:3000, date:"2025-01-10", status:"paid" },
  { id:"c2", memberName:"Priya Jadhav",   eventId:"e1", amount:3000, date:"2025-01-12", status:"paid" },
  { id:"c3", memberName:"Anil More",      eventId:"e1", amount:3000, date:null,         status:"pending" },
  { id:"c4", memberName:"Sunita Pawar",   eventId:"e1", amount:3000, date:null,         status:"pending" },
  { id:"c5", memberName:"Ravi Bhosale",   eventId:"e2", amount:2000, date:"2025-01-15", status:"paid" },
  { id:"c6", memberName:"Suresh Shinde",  eventId:"e4", amount:1500, date:"2024-10-05", status:"paid" },
  { id:"c7", memberName:"Priya Jadhav",   eventId:"e4", amount:1500, date:"2024-10-07", status:"paid" },
];
const DEF_EX = [
  { id:"x1", eventId:"e1", title:"Decoration & Flowers", amount:12000, date:"2025-01-20", category:"decor",     note:"Marigold garlands, rangoli" },
  { id:"x2", eventId:"e1", title:"Sound System",         amount:8000,  date:"2025-01-22", category:"equipment", note:"PA system rental" },
  { id:"x3", eventId:"e2", title:"Ganesh Idol",          amount:15000, date:"2025-08-20", category:"religious", note:"Eco-friendly idol" },
  { id:"x4", eventId:"e4", title:"Stage & Lighting",     amount:10000, date:"2024-10-10", category:"decor",     note:"Professional stage setup" },
  { id:"x5", eventId:"e4", title:"Catering",             amount:8000,  date:"2024-10-20", category:"food",      note:"Dinner for 150 guests" },
];
const DEF_GAL = [
  { id:"g1", eventId:"e4", title:"Diwali Stage Performance", emoji:"🪔", color:"#b45309", date:"2024-10-20" },
  { id:"g2", eventId:"e4", title:"Award Ceremony",           emoji:"🏅", color:"#1e6b3c", date:"2024-10-20" },
  { id:"g3", eventId:"e1", title:"Maharaj Jayanti Planning", emoji:"⚔️", color:"#8b0000", date:"2025-01-10" },
];

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();
    const pool = getPool();

    // Check if already seeded
    const check = await pool.query("SELECT COUNT(*) FROM events");
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(200).json({ message: 'Already seeded', count: check.rows[0].count });
    }

    // Insert events
    for (const e of DEF_EVTS) {
      await pool.query(
        `INSERT INTO events (id,name,date,budget,category,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [e.id, e.name, e.date, e.budget, e.category, e.status, e.description]
      );
    }

    // Insert contributions
    for (const c of DEF_CO) {
      await pool.query(
        `INSERT INTO contributions (id,member_name,event_id,amount,date,status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [c.id, c.memberName, c.eventId, c.amount, c.date||null, c.status]
      );
    }

    // Insert expenses
    for (const x of DEF_EX) {
      await pool.query(
        `INSERT INTO expenses (id,event_id,title,amount,date,category,note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [x.id, x.eventId, x.title, x.amount, x.date||null, x.category, x.note]
      );
    }

    // Insert gallery
    for (const g of DEF_GAL) {
      await pool.query(
        `INSERT INTO gallery (id,event_id,title,emoji,color,date) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [g.id, g.eventId, g.title, g.emoji, g.color, g.date||null]
      );
    }

    return res.status(200).json({ message: 'Seeded successfully!' });
  } catch (err) {
    console.error('[API/seed]', err);
    return res.status(500).json({ error: err.message });
  }
};
