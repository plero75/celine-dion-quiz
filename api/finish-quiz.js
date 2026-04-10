const crypto = require('crypto');
const {
  getState,
  findScoreByParticipantKey,
  createScore,
  deleteActiveGame,
  deleteActiveGamesByParticipantKey,
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
    const score = Number(body.score);
    const time = Number(body.time);
    const activeGameId = typeof body.activeGameId === 'string' ? body.activeGameId : '';

    if (!username || !Number.isFinite(score) || !Number.isFinite(time)) {
      sendJson(res, 400, { message: 'Les informations de résultat sont incomplètes.' });
      return;
    }

    const participantKey = normalizeName(username);
    const existingScore = await findScoreByParticipantKey(participantKey);

    if (existingScore) {
      await deleteActiveGame(activeGameId);
      await deleteActiveGamesByParticipantKey(participantKey);

      const state = await getState();
      sendJson(res, 409, {
        message: 'Ce pseudo a déjà été enregistré dans le classement partagé.',
        entry: existingScore,
        ...state,
      });
      return;
    }

    const entry = await createScore({
      id: crypto.randomUUID(),
      participantKey,
      username,
      score,
      time,
      date: new Date().toISOString(),
    });

    await deleteActiveGame(activeGameId);
    await deleteActiveGamesByParticipantKey(participantKey);

    const state = await getState();
    sendJson(res, 201, {
      entry,
      ...state,
    });
  } catch (error) {
    sendJson(res, 500, {
      message: error.message || "Impossible d'enregistrer ce score.",
    });
  }
};
