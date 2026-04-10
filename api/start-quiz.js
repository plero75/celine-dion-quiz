const crypto = require('crypto');
const {
  getState,
  findScoreByParticipantKey,
  findActiveGameByParticipantKey,
  createActiveGame,
} = require('../server/storage');
const { readJsonBody, sendJson, sendMethodNotAllowed } = require('../server/http');

function normalizeName(value) {
  return value.trim().toLocaleLowerCase('fr-FR');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = await readJsonBody(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    if (!username) {
      sendJson(res, 400, { message: 'Le pseudo est obligatoire.' });
      return;
    }

    const participantKey = normalizeName(username);
    const existingScore = await findScoreByParticipantKey(participantKey);

    if (existingScore) {
      const state = await getState();
      sendJson(res, 409, {
        message: 'Ce pseudo a déjà participé au classement partagé. Une seule tentative est autorisée.',
        ...state,
      });
      return;
    }

    const existingActiveGame = await findActiveGameByParticipantKey(participantKey);

    if (existingActiveGame) {
      const state = await getState();
      sendJson(res, 409, {
        message: 'Une partie est déjà en cours avec ce pseudo. Terminez-la avant de recommencer.',
        ...state,
      });
      return;
    }

    const now = new Date().toISOString();
    const activeGame = await createActiveGame({
      id: crypto.randomUUID(),
      participantKey,
      username,
      currentQuestion: 1,
      score: 0,
      elapsed: 0,
      startedAt: now,
      updatedAt: now,
    });

    const state = await getState();
    sendJson(res, 200, {
      activeGame,
      ...state,
    });
  } catch (error) {
    const statusCode = error.code === '23505' ? 409 : 500;
    sendJson(res, statusCode, {
      message: error.code === '23505'
        ? 'Une partie est déjà en cours avec ce pseudo. Terminez-la avant de recommencer.'
        : error.message || "Impossible d'ouvrir une partie partagée.",
    });
  }
};
