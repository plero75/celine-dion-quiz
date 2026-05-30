import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const sql = dbUrl ? neon(dbUrl) : null;

function send(res, status, payload) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(payload));
}

async function ensureTable() {
  if (!sql) throw new Error('DATABASE_URL is missing');
  await sql`
    CREATE TABLE IF NOT EXISTS mission_scores (
      game_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (game_id, player_id, mission_id)
    )
  `;
}

function buildBest(rows) {
  const best = { rose: {}, gustave: {}, jacques: {} };
  for (const row of rows) {
    if (!best[row.player_id]) best[row.player_id] = {};
    best[row.player_id][row.mission_id] = Number(row.score) || 0;
  }
  return best;
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
    if (!sql) return send(res, 500, { ok: false, error: 'DATABASE_URL is missing on Vercel' });

    await ensureTable();

    if (req.method === 'GET') {
      const gameId = String(req.query.gameId || 'mission-30-mai').slice(0, 80);
      const rows = await sql`
        SELECT player_id, mission_id, score
        FROM mission_scores
        WHERE game_id = ${gameId}
        ORDER BY player_id, mission_id
      `;
      return send(res, 200, { ok: true, gameId, best: buildBest(rows) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const gameId = String(body.gameId || 'mission-30-mai').slice(0, 80);
      const playerId = String(body.playerId || '').slice(0, 40);
      const missionId = String(body.missionId || '').slice(0, 40);
      const score = Math.max(0, Math.min(120, Math.round(Number(body.score) || 0)));

      if (!playerId || !missionId) return send(res, 400, { ok: false, error: 'playerId and missionId are required' });

      await sql`
        INSERT INTO mission_scores (game_id, player_id, mission_id, score, updated_at)
        VALUES (${gameId}, ${playerId}, ${missionId}, ${score}, NOW())
        ON CONFLICT (game_id, player_id, mission_id)
        DO UPDATE SET
          score = GREATEST(mission_scores.score, EXCLUDED.score),
          updated_at = NOW()
      `;

      const rows = await sql`
        SELECT player_id, mission_id, score
        FROM mission_scores
        WHERE game_id = ${gameId}
        ORDER BY player_id, mission_id
      `;
      return send(res, 200, { ok: true, gameId, best: buildBest(rows) });
    }

    if (req.method === 'DELETE') {
      const gameId = String(req.query.gameId || 'mission-30-mai').slice(0, 80);
      await sql`DELETE FROM mission_scores WHERE game_id = ${gameId}`;
      return send(res, 200, { ok: true, gameId, best: buildBest([]) });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error?.message || 'Unexpected error' });
  }
}
