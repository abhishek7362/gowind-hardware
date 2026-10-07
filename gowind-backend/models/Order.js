const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerType: { type: String, enum: ['customer', 'shopkeeper'], required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    qty: Number,
    unit: String,
    unitPrice: Number   // price at the time of order
  }],
  total: { type: Number, required: true },
  paymentMode: { type: String, enum: ['cash', 'upi', 'udhaar'], default: 'cash' },
  status: { type: String, enum: ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'], default: 'pending' },
  address: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
