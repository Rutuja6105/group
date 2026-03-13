// api/contributions.js — GET all, POST new, PUT mark paid, DELETE
const { getPool, initDB, cors } = require('./_db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();
    const pool = getPool();

    // GET — return all contributions
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM contributions ORDER BY created_at DESC'
      );
      // Map snake_case → camelCase for frontend
      const rows = result.rows.map(r => ({
        id: r.id,
        memberName: r.member_name,
        eventId: r.event_id,
        amount: r.amount,
        date: r.date ? r.date.toISOString().slice(0,10) : null,
        status: r.status,
      }));
      return res.status(200).json(rows);
    }

    // POST — insert new contribution
    if (req.method === 'POST') {
      const { id, memberName, eventId, amount, date, status } = req.body;
      const result = await pool.query(
        `INSERT INTO contributions (id, member_name, event_id, amount, date, status)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE
         SET member_name=$2, event_id=$3, amount=$4, date=$5, status=$6
         RETURNING *`,
        [id, memberName, eventId, amount, date || null, status]
      );
      const r = result.rows[0];
      return res.status(200).json({
        id: r.id, memberName: r.member_name, eventId: r.event_id,
        amount: r.amount, date: r.date?.toISOString().slice(0,10)||null, status: r.status
      });
    }

    // PUT — mark contribution as paid
    if (req.method === 'PUT') {
      const { id } = req.query;
      const today = new Date().toISOString().slice(0,10);
      const result = await pool.query(
        `UPDATE contributions SET status='paid', date=$1 WHERE id=$2 RETURNING *`,
        [today, id]
      );
      const r = result.rows[0];
      return res.status(200).json({
        id: r.id, memberName: r.member_name, eventId: r.event_id,
        amount: r.amount, date: r.date?.toISOString().slice(0,10)||null, status: r.status
      });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM contributions WHERE id=$1', [id]);
      return res.status(200).json({ deleted: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[API/contributions]', err);
    return res.status(500).json({ error: err.message });
  }
};
