import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

function cleanCode(value = '') {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24) || 'PARC30';
}

function toPayload(row) {
  return {
    code: row.code,
    scores: {
      rose: Number(row.rose_score || 0),
      gustave: Number(row.gustave_score || 0),
      jacques: Number(row.jacques_score || 0),
    },
    updatedAt: row.updated_at,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!connectionString) {
    return res.status(500).json({
      error: 'NEON_NOT_CONFIGURED',
      message: 'Missing DATABASE_URL, POSTGRES_URL or NEON_DATABASE_URL in Vercel environment variables.',
    });
  }

  const sql = neon(connectionString);

  await sql`
    CREATE TABLE IF NOT EXISTS mission_games (
      code TEXT PRIMARY KEY,
      rose_score INTEGER NOT NULL DEFAULT 0,
      gustave_score INTEGER NOT NULL DEFAULT 0,
      jacques_score INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (req.method === 'GET') {
    const code = cleanCode(req.query.code);
    const rows = await sql`
      INSERT INTO mission_games (code)
      VALUES (${code})
      ON CONFLICT (code) DO UPDATE SET updated_at = mission_games.updated_at
      RETURNING *
    `;
    return res.status(200).json(toPayload(rows[0]));
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const code = cleanCode(body.code);
    const player = String(body.player || '').toLowerCase();
    const points = Math.max(0, Math.min(120, Number(body.points || 0)));

    if (!['rose', 'gustave', 'jacques'].includes(player)) {
      return res.status(400).json({ error: 'INVALID_PLAYER' });
    }

    await sql`
      INSERT INTO mission_games (code)
      VALUES (${code})
      ON CONFLICT (code) DO NOTHING
    `;

    const field = player === 'rose' ? 'rose_score' : player === 'gustave' ? 'gustave_score' : 'jacques_score';
    const rows = await sql.unsafe(
      `UPDATE mission_games SET ${field} = ${field} + $1, updated_at = NOW() WHERE code = $2 RETURNING *`,
      [points, code]
    );

    return res.status(200).json(toPayload(rows[0]));
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
