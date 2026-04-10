const { updateActiveGame, deleteActiveGame } = require('../../server/storage');
const { readJsonBody, sendJson, sendMethodNotAllowed } = require('../../server/http');

module.exports = async function handler(req, res) {
  const id = req.query?.id;

  if (!id || typeof id !== 'string') {
    sendJson(res, 400, { message: 'Identifiant de partie invalide.' });
    return;
  }

  if (req.method === 'PATCH') {
    try {
      const body = await readJsonBody(req);
      const updatedGame = await updateActiveGame(id, {
        currentQuestion: Number.isFinite(Number(body.currentQuestion)) ? Number(body.currentQuestion) : undefined,
        score: Number.isFinite(Number(body.score)) ? Number(body.score) : undefined,
        elapsed: Number.isFinite(Number(body.elapsed)) ? Number(body.elapsed) : undefined,
        updatedAt: new Date().toISOString(),
      });

      if (!updatedGame) {
        sendJson(res, 404, { message: 'Partie en cours introuvable.' });
        return;
      }

      sendJson(res, 200, { activeGame: updatedGame });
      return;
    } catch (error) {
      sendJson(res, 500, {
        message: error.message || 'Impossible de mettre à jour cette partie.',
      });
      return;
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deleteActiveGame(id);
      sendJson(res, 200, { ok: true });
      return;
    } catch (error) {
      sendJson(res, 500, {
        message: error.message || 'Impossible de supprimer cette partie en cours.',
      });
      return;
    }
  }

  sendMethodNotAllowed(res, ['PATCH', 'DELETE']);
};
