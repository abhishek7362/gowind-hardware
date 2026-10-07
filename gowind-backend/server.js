require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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

mongoose.connect(process.env.MONGO_URI).then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log('Server running on port ' + port));
}).catch(err => { console.error('DB error:', err.message); process.exit(1); });
