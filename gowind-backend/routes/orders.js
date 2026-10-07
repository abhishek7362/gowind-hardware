const router = require('express').Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Ledger = require('../models/Ledger');
const { auth, requireRole } = require('../middleware/auth');
const { notifyNewOrder } = require('../utils/mail');
const { newOrderForAdmins } = require('../utils/notify');

// Place order. Prices, minimum quantity and stock are all checked here, not on the frontend.
router.post('/', auth, requireRole('customer', 'shopkeeper'), async (req, res) => {
  const { items, paymentMode = 'cash', address } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });
  const isShop = req.user.role === 'shopkeeper';
    const email = String(req.body.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Sahi email likho' });
  if (paymentMode === 'udhaar' && !isShop) return res.status(400).json({ error: 'Udhaar is only for shopkeepers' });

  const lines = []; let total = 0;
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    const p = await Product.findOne({ _id: it.productId, isActive: true });
    if (!p || !(qty > 0)) return res.status(400).json({ error: 'Invalid item in cart' });
    if (isShop && qty < p.minQty) return res.status(400).json({ error: `${p.name}: minimum ${p.minQty} ${p.unit || 'pcs'} required` });
    if (qty > p.stock) return res.status(400).json({ error: `${p.name}: only ${p.stock} ${p.unit || 'pcs'} in stock` });
    const unitPrice = isShop ? p.wholesalePrice : p.retailPrice;
    lines.push({ p, qty, unitPrice });
    total += unitPrice * qty;
  }

  // Reduce stock (conditional update so two orders can't oversell)
  for (const l of lines) {
    const r = await Product.updateOne({ _id: l.p._id, stock: { $gte: l.qty } }, { $inc: { stock: -l.qty } });
    if (!r.modifiedCount) return res.status(409).json({ error: `${l.p.name}: stock changed, try again` });
  }

  const order = await Order.create({
    user: req.user._id, buyerType: req.user.role, total, paymentMode, address,
    items: lines.map(l => ({ product: l.p._id, name: l.p.name, qty: l.qty, unit: l.p.unit || 'pcs', unitPrice: l.unitPrice }))
  });
  if (paymentMode === 'udhaar')
    await Ledger.create({ shopkeeper: req.user._id, order: order._id, type: 'debit', amount: total, note: 'Order udhaar' });
    if (email && !req.user.email) { req.user.email = email; await req.user.save(); }
  notifyNewOrder(order, req.user).catch(() => {});   // email to owner (and buyer), never blocks the order
     newOrderForAdmins(order, req.user).catch(() => {});
  res.status(201).json(order);
});

router.get('/mine', auth, async (req, res) =>
  res.json(await Order.find({ user: req.user._id }).sort('-createdAt').limit(100)));

// Shopkeeper's udhaar khata: balance + latest entries
router.get('/udhaar', auth, requireRole('shopkeeper'), async (req, res) => {
  const all = await Ledger.find({ shopkeeper: req.user._id }).sort('-createdAt');
  const balance = all.reduce((s, r) => s + (r.type === 'debit' ? r.amount : -r.amount), 0);
  res.json({ balance, entries: all.slice(0, 50) });
});

// Shopkeeper's udhaar balance
router.get('/udhaar/balance', auth, requireRole('shopkeeper'), async (req, res) => {
  const rows = await Ledger.find({ shopkeeper: req.user._id });
  const balance = rows.reduce((s, r) => s + (r.type === 'debit' ? r.amount : -r.amount), 0);
  res.json({ balance, entries: rows.length });
});

module.exports = router;
