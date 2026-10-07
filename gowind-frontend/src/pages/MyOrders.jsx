import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import './orders.css';
import { useLang } from '../i18n';

const LABEL = { pending: 'Pending', confirmed: 'Confirm ho gaya', packed: 'Pack ho gaya', delivered: 'Deliver ho gaya', cancelled: 'Cancel' };

export default function MyOrders() {
  const { user } = useAuth();
  const { t } = useLang();
  const { addMany } = useCart();
  const nav = useNavigate();
  const [orders, setOrders] = useState(null);
  const [khata, setKhata] = useState(null);   // shopkeeper only: { balance, entries }
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const isShop = user?.role === 'shopkeeper';

  useEffect(() => {
    if (!user) return;
    api('/orders/mine').then(setOrders).catch(e => setErr(e.message));
    if (isShop) api('/orders/udhaar').then(setKhata).catch(() => {});
  }, [user?.id]);

  // Reorder: current prices and stock are used, not the old ones
  async function reorder(o) {
    setErr(''); setMsg('');
    try {
      const fresh = await api('/products');
      const byId = new Map(fresh.map(p => [p.id, p]));
      const items = [];
      const skipped = [];
      for (const it of o.items) {
        const p = byId.get(String(it.product));
        if (p && p.inStock) items.push({ product: p, qty: it.qty });
        else skipped.push(it.name);
      }
      if (!items.length) return setErr(t('orders.unavailable'));
      addMany(items);
      if (skipped.length) setMsg(t('orders.skipped', { names: skipped.join(', ') }));
      else nav('/cart');
    } catch (e) { setErr(e.message); }
  }

  if (!user) return <p>{t('orders.loginToSee')} <Link to="/login" className="link">{t('cart.loginLink')}</Link>.</p>

  return (
    <>
      <h2>{t('orders.title')}</h2>

      {isShop && khata && (
        <div className="ud">
          {t('orders.udhaarBalance')} <b className="big">&#8377;{khata.balance}</b>
          {khata.entries.length > 0 && (
            <div className="kh">
              {khata.entries.slice(0, 8).map(k => (
                <div key={k._id}>
                  <span>{new Date(k.createdAt).toLocaleDateString()} &nbsp; {k.note}</span>
                  <b>{k.type === 'debit' ? '+' : '-'}&#8377;{k.amount}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {err && <p className="err">{err}</p>}
      {msg && <p className="note">{msg} <Link to="/cart" className="link">{t('orders.seeCart')}</Link></p>}
      {!orders && !err && <p>{t('common.loading')}</p>}
      {orders && !orders.length && <p>{t('orders.none')} <Link to="/" className="link">{t('orders.startShopping')}</Link></p>}

      {orders && orders.map(o => (
        <div className="ocard" key={o._id}>
          <div className="ohead">
            <span>{new Date(o.createdAt).toLocaleString()}</span>
            <span className={'st ' + o.status}>{t('status.' + o.status)}</span>
          </div>
          <div className="oitems">{o.items.map(i => `${i.name} x ${i.qty}${i.unit ? ' ' + i.unit : ''}`).join(', ')}</div>
          <div className="ofoot">
            <span><b>&#8377;{o.total}</b> &nbsp; <small>{t('pay.' + o.paymentMode)}</small></span>
            <button className="btn alt" style={{ marginTop: 0 }} onClick={() => reorder(o)}>{t('orders.reorder')}</button>
          </div>
        </div>
      ))}
    </>
  );
}
