const mongoose = require('mongoose');

// Udhaar ledger: debit = shopkeeper owes more, credit = shopkeeper paid
const ledgerSchema = new mongoose.Schema({
  shopkeeper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  note: String
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
