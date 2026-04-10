const fs = require('fs/promises');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const ACTIVE_GAME_TTL_MS = 2 * 60 * 1000;
const DB_FILE_PATH = path.join(process.cwd(), 'db.json');
const isProductionRuntime = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let schemaReadyPromise = null;

function normalizeScoreRow(row) {
  return {
    id: row.id,
    username: row.username,
    participantKey: row.participant_key,
    score: row.score,
    time: row.time_seconds,
    date: new Date(row.played_at).toISOString(),
  };
}

function normalizeActiveGameRow(row) {
  return {
    id: row.id,
    username: row.username,
    participantKey: row.participant_key,
    currentQuestion: row.current_question,
    score: row.score,
    elapsed: row.elapsed_seconds,
    startedAt: new Date(row.started_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function sortScores(entries) {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.time - b.time || a.date.localeCompare(b.date))
    .slice(0, 20);
}

function sortActiveGames(entries) {
  return [...entries].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function getStaleCutoffIso() {
  return new Date(Date.now() - ACTIVE_GAME_TTL_MS).toISOString();
}

function getSqlClient() {
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

async function ensureDatabaseSchema() {
  if (!databaseUrl) {
    if (isProductionRuntime) {
      throw new Error("Aucune base de données n'est configurée. Ajoutez une intégration Postgres/Neon sur Vercel.");
    }

    return null;
  }

  if (!schemaReadyPromise) {
    const sql = getSqlClient();

    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS quiz_scores (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          participant_key TEXT UNIQUE NOT NULL,
          score INTEGER NOT NULL CHECK (score >= 0),
          time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
          played_at TIMESTAMPTZ NOT NULL
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS active_games (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          participant_key TEXT UNIQUE NOT NULL,
          current_question INTEGER NOT NULL CHECK (current_question >= 1),
          score INTEGER NOT NULL CHECK (score >= 0),
          elapsed_seconds INTEGER NOT NULL CHECK (elapsed_seconds >= 0),
          started_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS quiz_scores_ranking_idx
        ON quiz_scores (score DESC, time_seconds ASC, played_at ASC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS active_games_updated_idx
        ON active_games (updated_at DESC)
      `;
    })();
  }

  await schemaReadyPromise;
  return getSqlClient();
}

async function readLocalState() {
  const raw = await fs.readFile(DB_FILE_PATH, 'utf8');
  const data = JSON.parse(raw || '{}');

  return {
    scores: Array.isArray(data.scores) ? data.scores : [],
    activeGames: Array.isArray(data.activeGames) ? data.activeGames : [],
  };
}

async function writeLocalState(nextState) {
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(nextState, null, 2));
}

async function cleanupStaleActiveGames() {
  const sql = await ensureDatabaseSchema();
  const staleCutoff = getStaleCutoffIso();

  if (sql) {
    await sql`DELETE FROM active_games WHERE updated_at < ${staleCutoff}`;
    return;
  }

  const state = await readLocalState();
  const nextState = {
    ...state,
    activeGames: state.activeGames.filter((entry) => entry.updatedAt >= staleCutoff),
  };

  await writeLocalState(nextState);
}

async function getState() {
  await cleanupStaleActiveGames();
  const sql = await ensureDatabaseSchema();

  if (sql) {
    const scoreRows = await sql`
      SELECT id, username, participant_key, score, time_seconds, played_at
      FROM quiz_scores
      ORDER BY score DESC, time_seconds ASC, played_at ASC
      LIMIT 20
    `;

    const activeRows = await sql`
      SELECT id, username, participant_key, current_question, score, elapsed_seconds, started_at, updated_at
      FROM active_games
      ORDER BY started_at ASC
    `;

    return {
      scores: scoreRows.map(normalizeScoreRow),
      activeGames: activeRows.map(normalizeActiveGameRow),
    };
  }

  const state = await readLocalState();
  return {
    scores: sortScores(state.scores),
    activeGames: sortActiveGames(state.activeGames),
  };
}

async function findScoreByParticipantKey(participantKey) {
  const sql = await ensureDatabaseSchema();

  if (sql) {
    const rows = await sql`
      SELECT id, username, participant_key, score, time_seconds, played_at
      FROM quiz_scores
      WHERE participant_key = ${participantKey}
      LIMIT 1
    `;

    return rows[0] ? normalizeScoreRow(rows[0]) : null;
  }

  const state = await readLocalState();
  return state.scores.find((entry) => entry.participantKey === participantKey) || null;
}

async function findActiveGameByParticipantKey(participantKey) {
  await cleanupStaleActiveGames();
  const sql = await ensureDatabaseSchema();

  if (sql) {
    const rows = await sql`
      SELECT id, username, participant_key, current_question, score, elapsed_seconds, started_at, updated_at
      FROM active_games
      WHERE participant_key = ${participantKey}
      LIMIT 1
    `;

    return rows[0] ? normalizeActiveGameRow(rows[0]) : null;
  }

  const state = await readLocalState();
  return state.activeGames.find((entry) => entry.participantKey === participantKey) || null;
}

async function createActiveGame(entry) {
  const sql = await ensureDatabaseSchema();

  if (sql) {
    await sql`
      INSERT INTO active_games (
        id,
        username,
        participant_key,
        current_question,
        score,
        elapsed_seconds,
        started_at,
        updated_at
      ) VALUES (
        ${entry.id},
        ${entry.username},
        ${entry.participantKey},
        ${entry.currentQuestion},
        ${entry.score},
        ${entry.elapsed},
        ${entry.startedAt},
        ${entry.updatedAt}
      )
    `;

    return entry;
  }

  const state = await readLocalState();
  state.activeGames.push(entry);
  await writeLocalState(state);
  return entry;
}

async function updateActiveGame(id, patch) {
  const sql = await ensureDatabaseSchema();

  if (sql) {
    const rows = await sql`
      UPDATE active_games
      SET
        current_question = COALESCE(${patch.currentQuestion}, current_question),
        score = COALESCE(${patch.score}, score),
        elapsed_seconds = COALESCE(${patch.elapsed}, elapsed_seconds),
        updated_at = ${patch.updatedAt}
      WHERE id = ${id}
      RETURNING id, username, participant_key, current_question, score, elapsed_seconds, started_at, updated_at
    `;

    return rows[0] ? normalizeActiveGameRow(rows[0]) : null;
  }

  const state = await readLocalState();
  const index = state.activeGames.findIndex((entry) => entry.id === id);

  if (index === -1) return null;

  state.activeGames[index] = {
    ...state.activeGames[index],
    ...patch,
  };

  await writeLocalState(state);
  return state.activeGames[index];
}

async function deleteActiveGame(id) {
  if (!id) return;

  const sql = await ensureDatabaseSchema();

  if (sql) {
    await sql`DELETE FROM active_games WHERE id = ${id}`;
    return;
  }

  const state = await readLocalState();
  state.activeGames = state.activeGames.filter((entry) => entry.id !== id);
  await writeLocalState(state);
}

async function deleteActiveGamesByParticipantKey(participantKey) {
  const sql = await ensureDatabaseSchema();

  if (sql) {
    await sql`DELETE FROM active_games WHERE participant_key = ${participantKey}`;
    return;
  }

  const state = await readLocalState();
  state.activeGames = state.activeGames.filter((entry) => entry.participantKey !== participantKey);
  await writeLocalState(state);
}

async function createScore(entry) {
  const sql = await ensureDatabaseSchema();

  if (sql) {
    await sql`
      INSERT INTO quiz_scores (
        id,
        username,
        participant_key,
        score,
        time_seconds,
        played_at
      ) VALUES (
        ${entry.id},
        ${entry.username},
        ${entry.participantKey},
        ${entry.score},
        ${entry.time},
        ${entry.date}
      )
    `;

    return entry;
  }

  const state = await readLocalState();
  state.scores.push(entry);
  await writeLocalState(state);
  return entry;
}

module.exports = {
  getState,
  findScoreByParticipantKey,
  findActiveGameByParticipantKey,
  createActiveGame,
  updateActiveGame,
  deleteActiveGame,
  deleteActiveGamesByParticipantKey,
  createScore,
};
