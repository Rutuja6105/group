// api/expenses.js — GET all, POST new, DELETE
const { getPool, initDB, cors } = require('./_db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();
    const pool = getPool();

    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
      const rows = result.rows.map(r => ({
        id: r.id, eventId: r.event_id, title: r.title,
        amount: r.amount, date: r.date?.toISOString().slice(0,10)||null,
        category: r.category, note: r.note,
      }));
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { id, eventId, title, amount, date, category, note } = req.body;
      const result = await pool.query(
        `INSERT INTO expenses (id, event_id, title, amount, date, category, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE
         SET event_id=$2, title=$3, amount=$4, date=$5, category=$6, note=$7
         RETURNING *`,
        [id, eventId, title, amount, date||null, category, note]
      );
      const r = result.rows[0];
      return res.status(200).json({
        id: r.id, eventId: r.event_id, title: r.title,
        amount: r.amount, date: r.date?.toISOString().slice(0,10)||null,
        category: r.category, note: r.note,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM expenses WHERE id=$1', [id]);
      return res.status(200).json({ deleted: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API/expenses]', err);
    return res.status(500).json({ error: err.message });
  }
};
