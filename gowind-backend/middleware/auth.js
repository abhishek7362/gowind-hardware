const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function load(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    return user && user.isActive ? user : null;
  } catch { return null; }
}

// Guests allowed. Sets req.user if a valid token is present.
exports.optionalAuth = async (req, res, next) => { req.user = await load(req); next(); };

// Login required.
exports.auth = async (req, res, next) => {
  req.user = await load(req);
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  next();
};

exports.requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed' });
