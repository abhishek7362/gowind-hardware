const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  retailPrice: { type: Number, required: true, min: 0 },
  wholesalePrice: { type: Number, required: true, min: 0 },
  minQty: { type: Number, default: 1, min: 1 },   // minimum order for shopkeepers
  unit: { type: String, default: 'pcs', trim: true },   // pcs, kg, bag, meter, litre ...
  stock: { type: Number, default: 0, min: 0 },
  imageUrl: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', category: 'text' });
module.exports = mongoose.model('Product', productSchema);
