// api/events.js — GET all events, POST new event, DELETE event
const { getPool, initDB, cors } = require('./_db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();
    const pool = getPool();

    // GET — return all events ordered by date
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM events ORDER BY date DESC'
      );
      return res.status(200).json(result.rows);
    }

    // POST — insert new event
    if (req.method === 'POST') {
      const { id, name, date, budget, category, status, description } = req.body;
      const result = await pool.query(
        `INSERT INTO events (id, name, date, budget, category, status, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE
         SET name=$2, date=$3, budget=$4, category=$5, status=$6, description=$7
         RETURNING *`,
        [id, name, date, budget, category, status, description]
      );
      return res.status(200).json(result.rows[0]);
    }

    // DELETE — remove event by id (query param)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM events WHERE id=$1', [id]);
      return res.status(200).json({ deleted: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API/events]', err);
    return res.status(500).json({ error: err.message });
  }
};
