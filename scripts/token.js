require('dotenv').config({ quiet: true });
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET is required. Set it in your local .env file.');
}

const token = jwt.sign({ sub: '1' }, secret, {
  algorithm: 'HS256',
  expiresIn: '15m',
});

console.log(token);
