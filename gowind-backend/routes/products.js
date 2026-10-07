const router = require('express').Router();
const Product = require('../models/Product');
const { optionalAuth, auth, requireRole } = require('../middleware/auth');

// Price is chosen on the SERVER. Wholesale price is never sent to customers or guests.
router.get('/', optionalAuth, async (req, res) => {
  const { category, q } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const list = await Product.find(filter).sort('category name');
  const isShop = req.user && req.user.role === 'shopkeeper';
  res.json(list.map(p => ({
    id: p._id, name: p.name, category: p.category, imageUrl: p.imageUrl,
    inStock: p.stock > 0,
    unit: p.unit || 'pcs',
    price: isShop ? p.wholesalePrice : p.retailPrice,
    ...(isShop ? { retailPrice: p.retailPrice, minQty: p.minQty } : {})
  })));
});

// Admin only
router.post('/', auth, requireRole('admin'), async (req, res) => res.status(201).json(await Product.create(req.body)));
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

module.exports = router;
