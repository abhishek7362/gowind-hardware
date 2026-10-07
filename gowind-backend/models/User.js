const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['customer', 'shopkeeper', 'admin'], default: 'customer' },
  mobile: { type: String, unique: true, sparse: true },   // customers and admin login
  shopId: { type: String, unique: true, sparse: true },   // shopkeepers login, e.g. GWD-1001
  address: { type: String, trim: true, default: '' },     // delivery address
  email: { type: String, trim: true, lowercase: true, default: '' },   // for order emails
  shopName: String,                                       // shopkeepers only
  passwordHash: { type: String, required: true },
  mustChangePassword: { type: Boolean, default: false },  // true for fresh shopkeeper PIN
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
