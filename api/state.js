const { getState } = require('../server/storage');
const { sendJson, sendMethodNotAllowed } = require('../server/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  try {
    const state = await getState();
    sendJson(res, 200, state);
  } catch (error) {
    sendJson(res, 500, {
      message: error.message || 'Impossible de charger le classement partagé.',
    });
  }
};
