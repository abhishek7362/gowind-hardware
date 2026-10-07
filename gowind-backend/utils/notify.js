// In-app notifications (bell icon). Separate from email, so it works even if email is not set up.
const Notification = require('../models/Notification');
const User = require('../models/User');

const rs = '\u20B9';
const shortId = o => String(o._id).slice(-6).toUpperCase();
const STATUS_TITLE = {
  confirmed: 'Order confirm ho gaya',
  packed: 'Order pack ho gaya',
  delivered: 'Order deliver ho gaya',
  cancelled: 'Order cancel ho gaya'
};

// New order -> every admin (owner) gets a notification
async function newOrderForAdmins(order, buyer) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (!admins.length) return;
  const who = buyer.role === 'shopkeeper' ? `${buyer.shopName || buyer.name} (${buyer.shopId})` : buyer.name;
  const n = order.items.length;
  await Notification.insertMany(admins.map(a => ({
    user: a._id, type: 'new_order', order: order._id,
    title: `Naya order #${shortId(order)}`,
    message: `${who} - ${rs}${order.total} (${n} item${n > 1 ? 's' : ''})`
  })));
}

// Status changed by the owner -> the buyer (customer or shopkeeper) gets a notification
async function statusForBuyer(order) {
  const label = STATUS_TITLE[order.status];
  if (!label) return;                                   // no notification for "pending"
  const title = `${label} (#${shortId(order)})`;
  const dup = await Notification.findOne({ user: order.user, order: order._id, title });
  if (dup) return;                                      // same status chosen twice: notify once
  await Notification.create({ user: order.user, type: 'order_status', order: order._id, title, message: `Total ${rs}${order.total}` });
}

module.exports = { newOrderForAdmins, statusForBuyer };
