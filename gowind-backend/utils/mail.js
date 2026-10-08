// Order emails.
// Laptop par: Gmail SMTP (SMTP_USER + SMTP_PASS).
// Online (Render free plan SMTP block karta hai): Brevo ki HTTPS API (BREVO_API_KEY + MAIL_FROM).
// Email set na ho to app chalta rehta hai, bas mail skip hoti hai.
const nodemailer = require('nodemailer');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SHOP = () => process.env.SHOP_NAME || 'Gowind Hardware';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,   // block ho to jaldi error de
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

async function sendViaBrevo({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: SHOP(), email: process.env.MAIL_FROM || process.env.SMTP_USER },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  if (!res.ok) throw new Error('Brevo ' + res.status + ': ' + (await res.text()).slice(0, 200));
}

// Never throws: a mail problem must not break an order
async function sendMail({ to, subject, html }) {
  if (!to) { console.log('[mail skipped]', subject, '-> (no email address)'); return; }
  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevo({ to, subject, html });
    } else {
      const t = getTransporter();
      if (!t) { console.log('[mail skipped] email settings nahi hain (BREVO_API_KEY ya SMTP_USER/SMTP_PASS):', subject); return; }
      await t.sendMail({ from: `"${SHOP()}" <${process.env.SMTP_USER}>`, to, subject, html });
    }
    console.log('[mail sent]', subject, '->', to);
  } catch (e) {
    console.error('[mail failed]', e.message);
  }
}

const shortId = o => String(o._id).slice(-6).toUpperCase();

const layout = (title, body) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e3e1d8;border-radius:10px;overflow:hidden">
  <div style="background:#EA580C;color:#fff;padding:14px 18px;font-size:18px"><b>${esc(SHOP())}</b></div>
  <div style="padding:18px;color:#1d1d1b;font-size:15px;line-height:1.5">
    <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
    ${body}
  </div>
  <div style="background:#f6f5f1;color:#6b6a65;padding:10px 18px;font-size:12px">${esc(SHOP())} | Aapka hardware partner</div>
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

// ---- naya order: owner ko mail (aur buyer ko receipt, agar uska email hai)
exports.notifyNewOrder = async (order, buyer) => {
  const id = shortId(order);
  const who = buyer.role === 'shopkeeper'
    ? `${esc(buyer.shopName)} (${esc(buyer.shopId)}), ${esc(buyer.name)}`
    : esc(buyer.name);
  const admin = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin`;

  await sendMail({
    to: process.env.OWNER_EMAIL || process.env.SMTP_USER,
    subject: `Naya order #${id}: Rs ${order.total} - ${buyer.name}`,
    html: layout(`Naya order aaya hai #${id}`, `
      <p style="margin:0 0 6px"><b>${buyer.role === 'shopkeeper' ? 'Shopkeeper (wholesale)' : 'Customer (retail)'}:</b> ${who}</p>
      ${buyer.mobile ? `<p style="margin:0 0 6px">Mobile: ${esc(buyer.mobile)}</p>` : ''}
      ${itemsTable(order)}
      <p><a href="${esc(admin)}" style="color:#EA580C">Admin panel mein order dekho</a></p>`)
  });

  const buyerEmail = buyer.email || order.email;
  if (buyerEmail) {
    await sendMail({
      to: buyerEmail,
      subject: `Aapka order #${id} mil gaya`,
      html: layout(`Dhanyavaad! Aapka order mil gaya (#${id})`, `
        <p>Hum jald hi aapka order confirm karenge. Status aapko email se milta rahega.</p>
        ${itemsTable(order)}`)
    });
  }
};

// ---- owner ne status badla: buyer ko mail
const STATUS_TEXT = {
  pending: ['Order mil gaya', 'Aapka order abhi pending hai.'],
  confirmed: ['Order confirm ho gaya', 'Aapka order confirm ho gaya hai. Hum ise taiyar kar rahe hain.'],
  packed: ['Order pack ho gaya', 'Aapka saman pack ho gaya hai aur jald bheja jayega.'],
  delivered: ['Order deliver ho gaya', 'Aapka order deliver ho gaya hai. Hamse kharidne ke liye dhanyavaad!'],
  cancelled: ['Order cancel ho gaya', 'Aapka order cancel kar diya gaya hai. Koi sawal ho to dukan se sampark karein.']
};

exports.notifyStatus = async (order, buyer) => {
  const to = (buyer && buyer.email) || order.email;
  if (!to) { console.log('[mail skipped] status mail:', order.status, '-> is customer ka email save nahi hai'); return; }
  const [title, note] = STATUS_TEXT[order.status] || [order.status, ''];
  await sendMail({
    to,
    subject: `Order #${shortId(order)}: ${title}`,
    html: layout(`${title} (#${shortId(order)})`, `<p>${esc(note)}</p>${itemsTable(order)}`)
  });
};

// purane naamon ke saath bhi chalta rahe
exports.sendMail = sendMail;
exports.notifyOwnerNewOrder = exports.notifyNewOrder;
exports.notifyCustomerStatus = (order, toEmail, name) => exports.notifyStatus(order, { email: toEmail, name });
