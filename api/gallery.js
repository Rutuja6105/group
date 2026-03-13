// api/gallery.js — GET all, POST new, DELETE
const { getPool, initDB, cors } = require('./_db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();
    const pool = getPool();

    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM gallery ORDER BY date DESC');
      const rows = result.rows.map(r => ({
        id: r.id, eventId: r.event_id, title: r.title,
        emoji: r.emoji, color: r.color,
        date: r.date?.toISOString().slice(0,10)||null,
      }));
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { id, eventId, title, emoji, color, date } = req.body;
      const result = await pool.query(
        `INSERT INTO gallery (id, event_id, title, emoji, color, date)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE
         SET event_id=$2, title=$3, emoji=$4, color=$5, date=$6
         RETURNING *`,
        [id, eventId, title, emoji, color, date||null]
      );
      const r = result.rows[0];
      return res.status(200).json({
        id: r.id, eventId: r.event_id, title: r.title,
        emoji: r.emoji, color: r.color,
        date: r.date?.toISOString().slice(0,10)||null,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM gallery WHERE id=$1', [id]);
      return res.status(200).json({ deleted: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API/gallery]', err);
    return res.status(500).json({ error: err.message });
  }
};
