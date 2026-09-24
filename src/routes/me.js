const express = require('express');
const requireAuth = require('../middleware/auth');
const { getUserById } = require('../services/userService');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const user = await getUserById(Number(req.auth.sub));

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json(user);
});

module.exports = router;
