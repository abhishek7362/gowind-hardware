const mongoose = require('mongoose');

// In-app notification (the bell icon). One row per person who should see it.
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },   // who sees it
  type: { type: String, enum: ['new_order', 'order_status'], required: true },
  title: { type: String, required: true },
  message: String,
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
