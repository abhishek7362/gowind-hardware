// Run once: node seed.js   (creates admin + sample products)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  if (!(await User.findOne({ role: 'admin' }))) {
    await User.create({ name: 'Owner', role: 'admin', mobile: '9999999999', passwordHash: await bcrypt.hash('admin123', 10) });
    console.log('Admin created: mobile 9999999999 / password admin123 (change it!)');
  }
  if (!(await Product.countDocuments())) {
    await Product.insertMany([
      { name: 'Finolex PVC Pipe 1 inch', category: 'Pipes', retailPrice: 180, wholesalePrice: 140, minQty: 10, stock: 200 },
      { name: 'Asian Paints Apex Ultima 1L', category: 'Paints', retailPrice: 450, wholesalePrice: 380, minQty: 6, stock: 80 },
      { name: 'UltraTech Cement 50kg', category: 'Cement', retailPrice: 380, wholesalePrice: 350, minQty: 20, stock: 300 },
      { name: 'Bosch GSB 550 Drill', category: 'Tools', retailPrice: 2799, wholesalePrice: 2450, minQty: 3, stock: 15 }
    ]);
    console.log('Sample products added');
  }
  process.exit(0);
})();
