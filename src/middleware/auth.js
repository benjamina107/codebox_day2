const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET is required. Set it in your local .env file.');
}

function requireAuth(req, res, next) {
  const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '');

  if (!match) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.exp !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = requireAuth;
