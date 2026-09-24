const express = require('express');
const requireAuth = require('../middleware/auth');
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../services/userService');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await getUsers());
});

router.get('/:id', async (req, res) => {
  const user = await getUserById(Number(req.params.id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

router.post('/', requireAuth, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'Name is required' });

  res.status(201).json(await createUser(name));
});

router.put('/:id', requireAuth, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const user = await updateUser(Number(req.params.id), name);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json(user);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const deleted = await deleteUser(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'User not found' });

  res.status(204).end();
});

module.exports = router;
