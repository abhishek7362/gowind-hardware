require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));  // product photos

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => res.json({ ok: true, app: 'Gowind Hardware API' }));

// Online deploy par admin banata hai / update karta hai (sirf jab ADMIN_MOBILE aur ADMIN_PASSWORD set hon)
async function ensureAdmin() {
  const { ADMIN_MOBILE, ADMIN_PASSWORD } = process.env;
  console.log('[admin] ADMIN_MOBILE set:', !!ADMIN_MOBILE, '| ADMIN_PASSWORD set:', !!ADMIN_PASSWORD);
  if (!ADMIN_MOBILE || !ADMIN_PASSWORD) return;
  try {
    const mobile = ADMIN_MOBILE.trim();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD.trim(), 10);
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      admin.mobile = mobile; admin.passwordHash = passwordHash; admin.isActive = true;
      await admin.save();
      console.log('[admin] existing admin updated from env, mobile:', mobile);
    } else {
      await User.create({ name: 'Owner', role: 'admin', mobile, passwordHash });
      console.log('[admin] admin created from env, mobile:', mobile);
    }
  } catch (e) {
    console.error('[admin] could not set admin:', e.message);
  }
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await ensureAdmin();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log('Server running on port ' + port));
}).catch(err => { console.error('DB error:', err.message); process.exit(1); });