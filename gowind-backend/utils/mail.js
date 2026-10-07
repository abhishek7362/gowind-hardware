// Order emails. Uses Gmail (or any SMTP) through nodemailer.
// If SMTP is not configured in .env the app still works, emails are just skipped.
const nodemailer = require('nodemailer');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

// Never throws: a mail problem must not break an order
async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t || !to) { console.log('[mail skipped]', subject, '->', to || '(no email)'); return; }
  try {
    await t.sendMail({ from: `"Gowind Hardware" <${process.env.SMTP_USER}>`, to, subject, html });
    console.log('[mail sent]', subject, '->', to);
  } catch (e) {
    console.error('[mail failed]', e.message);
  }
}

const shortId = o => String(o._id).slice(-6).toUpperCase();

const layout = (title, body) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e3e1d8;border-radius:10px;overflow:hidden">
  <div style="background:#EA580C;color:#fff;padding:14px 18px;font-size:18px"><b>Gowind Hardware</b></div>
  <div style="padding:18px;color:#1d1d1b;font-size:15px;line-height:1.5">
    <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
    ${body}
  </div>
  <div style="background:#f6f5f1;color:#6b6a65;padding:10px 18px;font-size:12px">Gowind Hardware | Aapka hardware partner</div>
</div>`;

const itemsTable = o => `
<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:14px">
  <tr style="background:#f6f5f1;text-align:left"><th style="padding:6px">Product</th><th style="padding:6px">Quantity</th><th style="padding:6px;text-align:right">Amount</th></tr>
  ${o.items.map(i => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${esc(i.name)}</td>
    <td style="padding:6px;border-bottom:1px solid #eee">${esc(i.qty)} ${esc(i.unit || '')}</td>
    <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">Rs ${esc(i.qty * i.unitPrice)}</td></tr>`).join('')}
  <tr><td colspan="2" style="padding:8px 6px"><b>Total</b></td><td style="padding:8px 6px;text-align:right"><b>Rs ${esc(o.total)}</b></td></tr>
</table>
<p style="margin:4px 0;font-size:14px">Payment: <b>${esc(o.paymentMode)}</b></p>
${o.address ? `<p style="margin:4px 0;font-size:14px">Delivery address: ${esc(o.address)}</p>` : ''}`;

// ---- new order: email to the owner (and a receipt to the buyer if he has an email)
exports.notifyNewOrder = async (order, buyer) => {
  const id = shortId(order);
  const who = buyer.role === 'shopkeeper'
    ? `${esc(buyer.shopName)} (${esc(buyer.shopId)}), ${esc(buyer.name)}`
    : esc(buyer.name);
  const admin = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin`;

  await sendMail({
    to: process.env.OWNER_EMAIL,
    subject: `Naya order #${id}: Rs ${order.total} - ${buyer.name}`,
    html: layout(`Naya order aaya hai #${id}`, `
      <p style="margin:0 0 6px"><b>${buyer.role === 'shopkeeper' ? 'Shopkeeper (wholesale)' : 'Customer (retail)'}:</b> ${who}</p>
      ${buyer.mobile ? `<p style="margin:0 0 6px">Mobile: ${esc(buyer.mobile)}</p>` : ''}
      ${itemsTable(order)}
      <p><a href="${esc(admin)}" style="color:#EA580C">Admin panel mein order dekho</a></p>`)
  });

  if (buyer.email) {
    await sendMail({
      to: buyer.email,
      subject: `Aapka order #${id} mil gaya`,
      html: layout(`Dhanyavaad! Aapka order mil gaya (#${id})`, `
        <p>Hum jald hi aapka order confirm karenge. Status aapko email se milta rahega.</p>
        ${itemsTable(order)}`)
    });
  }
};

// ---- status changed by the owner: email to the buyer
const STATUS_TEXT = {
  pending: ['Order mil gaya', 'Aapka order abhi pending hai.'],
  confirmed: ['Order confirm ho gaya', 'Aapka order confirm ho gaya hai. Hum ise taiyar kar rahe hain.'],
  packed: ['Order pack ho gaya', 'Aapka saman pack ho gaya hai aur jald bheja jayega.'],
  delivered: ['Order deliver ho gaya', 'Aapka order deliver ho gaya hai. Hamse kharidne ke liye dhanyavaad!'],
  cancelled: ['Order cancel ho gaya', 'Aapka order cancel kar diya gaya hai. Koi sawal ho to dukan se sampark karein.']
};

exports.notifyStatus = async (order, buyer) => {
  if (!buyer.email) return;
  const [title, note] = STATUS_TEXT[order.status] || [order.status, ''];
  await sendMail({
    to: buyer.email,
    subject: `Order #${shortId(order)}: ${title}`,
    html: layout(`${title} (#${shortId(order)})`, `<p>${esc(note)}</p>${itemsTable(order)}`)
  });
};

