const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

router.use(auth);

// Latest 30 notifications + how many are unread
router.get('/', async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(30);
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ items, unread });
});

router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

router.patch('/:id/read', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Galat id' });
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
});

module.exports = router;
