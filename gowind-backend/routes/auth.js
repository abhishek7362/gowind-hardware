const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, role: u.role, shopId: u.shopId, shopName: u.shopName, mobile: u.mobile, address: u.address || '', email: u.email || '', mustChangePassword: u.mustChangePassword });

// Customer signup (shopkeepers cannot sign up, admin creates them)
router.post('/signup', async (req, res) => {
  const { name, mobile, password, email } = req.body;
  if (!name || !/^\d{10}$/.test(mobile || '') || (password || '').length < 6)
    return res.status(400).json({ error: 'Valid name, 10-digit mobile and 6+ char password required' });
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Sahi email likho' });
  if (await User.findOne({ mobile })) return res.status(409).json({ error: 'Mobile already registered' });
  const user = await User.create({ name, mobile, email: email.trim().toLowerCase(), role: 'customer', passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

// Login: customers/admin use mobile, shopkeepers use shop ID (e.g. GWD-1001)
router.post('/login', async (req, res) => {
  const { id, password } = req.body;
  const user = await User.findOne({ $or: [{ mobile: id }, { shopId: (id || '').toUpperCase() }] });
  if (!user || !user.isActive || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Wrong ID or password' });
  res.json({ token: sign(user), user: pub(user) });
});

router.post('/change-password', auth, async (req, res) => {
  const { newPassword } = req.body;
  if ((newPassword || '').length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  req.user.mustChangePassword = false;
  await req.user.save();
  res.json({ ok: true });
});

// Save the logged-in user's delivery address
router.patch('/address', auth, async (req, res) => {
  req.user.address = String(req.body.address || '').trim().slice(0, 300);
  await req.user.save();
  res.json({ user: pub(req.user) });
});

// Save / change the logged-in user's email (order updates are sent here)
router.patch('/email', auth, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Sahi email likho' });
  req.user.email = email;
  await req.user.save();
  res.json({ user: pub(req.user) });
});

module.exports = router;
