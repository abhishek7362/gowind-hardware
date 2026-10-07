import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useLang } from '../i18n';
import './images.css';

export default function Cart() {
  const { user } = useAuth();
  const { t } = useLang();
  const { lines, setQty, clear, total } = useCart();
  const [pay, setPay] = useState('cash');
  const [address, setAddress] = useState(user?.address || '');
  const [email, setEmail] = useState(user?.email || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const isShop = user?.role === 'shopkeeper';

  async function place() {
    setErr(''); setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { items: lines.map(l => ({ productId: l.product.id, qty: l.qty })), paymentMode: pay, address, email }
      });
      clear();
      setDone(order);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return (
    <div className="panel">
      <h2>{t('cart.done')}</h2>
      <p>{t('cart.doneMsg', { total: done.total })}</p>
      <Link to="/" className="btn">{t('cart.moreShopping')}</Link>
    </div>
  );

  if (!lines.length) return <p>{t('cart.empty')} <Link to="/" className="link">{t('cart.seeProducts')}</Link></p>;

  return (
    <div className="panel wide">
      <h2>{t('cart.title')}</h2>
      {lines.map(l => (
        <div className="line" key={l.product.id}>
          <div className="grow">
            <b>{l.product.name}</b>
            <div className="min">{t('cart.perUnit', { price: l.product.price, unit: l.product.unit })}{isShop ? t('cart.minimum', { n: l.product.minQty, unit: l.product.unit }) : ''}</div>
          </div>
          <button className="qty" onClick={() => setQty(l.product.id, l.qty - 1)}>-</button>
          <span className="qn">{l.qty} {l.product.unit}</span>
          <button className="qty" onClick={() => setQty(l.product.id, l.qty + 1)}>+</button>
          <span className="amt">&#8377;{l.product.price * l.qty}</span>
        </div>
      ))}
      <div className="line total"><span className="grow">{t('cart.total')}</span><b>&#8377;{total}</b></div>

      {!user ? (
        <p className="note">{t('cart.loginToOrder')} <Link to="/login" className="link">{t('cart.loginLink')}</Link>.</p>
      ) : (
        <>
          <label>{t('cart.address')}<input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('cart.addressPh')} /></label>
          <label>{t('cart.email')}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="aap@gmail.com" /></label>
          <label>{t('cart.payment')}
            <select value={pay} onChange={e => setPay(e.target.value)}>
              <option value="cash">{t('cart.cash')}</option>
              <option value="upi">{t('cart.upi')}</option>
              {isShop && <option value="udhaar">{t('cart.udhaar')}</option>}
            </select>
          </label>
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy} onClick={place}>{busy ? t('common.wait') : t('cart.place')}</button>
        </>
      )}
    </div>
  );
}
