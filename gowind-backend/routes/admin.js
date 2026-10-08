const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Ledger = require('../models/Ledger');
const { sendMail, notifyCustomerStatus } = require('../utils/mail');
const { isValidObjectId } = require('mongoose');
const { statusForBuyer } = require('../utils/notify');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, requireRole } = require('../middleware/auth');

// Product photos (JPG, PNG, WEBP up to 2 MB).
// Cloudinary keys set hon (online) -> photo Cloudinary par jati hai aur hamesha rehti hai.
// Set na hon (laptop) -> photo backend ke /uploads folder mein save hoti hai.
const cloudinary = require('cloudinary').v2;
const useCloud = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
if (useCloud && !process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}
const dir = path.join(__dirname, '..', 'uploads');
if (!useCloud) fs.mkdirSync(dir, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: useCloud ? multer.memoryStorage() : multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + EXT[file.mimetype])
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => EXT[file.mimetype] ? cb(null, true) : cb(new Error('Sirf JPG, PNG ya WEBP photo chalegi'))
});

router.use(auth, requireRole('admin'));

const newPin = () => String(Math.floor(100000 + Math.random() * 900000));

// Create a shopkeeper: generates shop ID and a temporary PIN (shown only once)
router.post('/shopkeepers', async (req, res) => {
  const { name, shopName } = req.body;
  if (!name || !shopName) return res.status(400).json({ error: 'name and shopName required' });
  const count = await User.countDocuments({ role: 'shopkeeper' });
  const shopId = 'GWD-' + (1001 + count);
  const pin = newPin();
  await User.create({
    name, shopName, shopId, role: 'shopkeeper',
    passwordHash: await bcrypt.hash(pin, 10), mustChangePassword: true
  });
  res.status(201).json({ shopId, tempPin: pin });
});

// Shopkeepers with their udhaar balance (debit adds, credit subtracts)
router.get('/shopkeepers', async (req, res) => {
  const list = await User.find({ role: 'shopkeeper' }).select('-passwordHash').sort('shopId').lean();
  const sums = await Ledger.aggregate([{ $group: { _id: '$shopkeeper', balance: {
    $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', { $multiply: ['$amount', -1] }] } } } }]);
  const map = new Map(sums.map(s => [String(s._id), s.balance]));
  res.json(list.map(u => ({ ...u, balance: map.get(String(u._id)) || 0 })));
});

// Owner records a payment received from a shopkeeper
router.post('/shopkeepers/:id/payment', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Galat shopkeeper id' });
  if (!(amount > 0)) return res.status(400).json({ error: 'Sahi amount likho' });
  const u = await User.findOne({ _id: req.params.id, role: 'shopkeeper' });
  if (!u) return res.status(404).json({ error: 'Shopkeeper nahi mila' });
  await Ledger.create({ shopkeeper: u._id, type: 'credit', amount, note: String(req.body.note || 'Payment mili').slice(0, 100) });
  res.status(201).json({ ok: true });
});

router.get('/shopkeepers/:id/ledger', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Galat shopkeeper id' });
  res.json(await Ledger.find({ shopkeeper: req.params.id }).sort('-createdAt').limit(30));
});

router.patch('/shopkeepers/:id/active', async (req, res) => {
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'shopkeeper' }, { isActive: !!req.body.isActive }, { new: true });
  u ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

// Reset a shopkeeper's PIN (new temporary PIN is shown once)
router.post('/shopkeepers/:shopId/reset-pin', async (req, res) => {
  const u = await User.findOne({ shopId: req.params.shopId.toUpperCase(), role: 'shopkeeper' });
  if (!u) return res.status(404).json({ error: 'Shop ID not found' });
  const pin = newPin();
  u.passwordHash = await bcrypt.hash(pin, 10);
  u.mustChangePassword = true;
  await u.save();
  res.json({ shopId: u.shopId, tempPin: pin });
});

// Full product list for admin (includes wholesale price and hidden products)
router.get('/products', async (req, res) => res.json(await Product.find().sort('category name')));

router.post('/products/:id/image', (req, res) => {
  upload.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo 2 MB se choti honi chahiye' : err.message });
    if (!req.file) return res.status(400).json({ error: 'Photo chuno' });
    let imageUrl;
    if (useCloud) {
      try {
        imageUrl = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({ folder: 'gowind/products', resource_type: 'image' },
            (e, r) => (e ? reject(e) : resolve(r.secure_url))).end(req.file.buffer);
        });
      } catch (e) {
        return res.status(500).json({ error: 'Photo upload nahi hui: ' + e.message });
      }
    } else {
      imageUrl = '/uploads/' + req.file.filename;
    }
    const p = await Product.findByIdAndUpdate(req.params.id, { imageUrl }, { new: true });
    p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
  });
});

router.get('/orders', async (req, res) =>
  res.json(await Order.find().sort('-createdAt').limit(200).populate('user', 'name shopName shopId mobile')));

// Change order status. Cancelling puts the stock back and (for udhaar orders) reverses the udhaar.
router.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Galat order id' });
  if (!['pending', 'confirmed', 'packed', 'delivered', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Galat status' });
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order nahi mila' });
  if (o.status === 'cancelled') return res.status(400).json({ error: 'Cancel hua order dobara chalu nahi ho sakta' });
  if (status === 'cancelled') {
    for (const it of o.items) if (it.product) await Product.updateOne({ _id: it.product }, { $inc: { stock: it.qty } });
    if (o.paymentMode === 'udhaar')
      await Ledger.create({ shopkeeper: o.user, order: o._id, type: 'credit', amount: o.total, note: 'Order cancel hua' });
  }
  const prev = o.status;
  o.status = status;
  await o.save();
  statusForBuyer(o).catch(() => {});           // bell notification for the buyer
  if (status !== prev && status !== 'pending') {
    const buyer = await User.findById(o.user).select('name email');
    notifyCustomerStatus(o, o.email || (buyer && buyer.email), buyer && buyer.name);   // background mail to customer
  }
  res.json(o);
});

// Quick check that email setup works (sends a test mail to the owner)
router.post('/test-mail', async (req, res) => {
  const to = process.env.OWNER_EMAIL || process.env.SMTP_USER;
  const r = await sendMail({ to, subject: 'Gowind Hardware - test mail', text: 'Email setup sahi chal raha hai.' });
  res.json({ to, ...r });
});

// Rename a category for all its products (fixes Steel / steel type spelling problems)
router.patch('/categories', async (req, res) => {
  const from = String(req.body.from || '').trim();
  const to = String(req.body.to || '').trim();
  if (!from || !to) return res.status(400).json({ error: 'Purani aur nayi category likho' });
  const r = await Product.updateMany({ category: from }, { category: to });
  res.json({ changed: r.modifiedCount });
});

module.exports = router;
