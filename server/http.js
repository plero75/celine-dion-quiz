async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendMethodNotAllowed(res, allowedMethods) {
  res.setHeader('Allow', allowedMethods.join(', '));
  sendJson(res, 405, { message: 'Méthode non autorisée.' });
}

module.exports = {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
};
