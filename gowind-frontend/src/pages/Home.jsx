import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useLang } from '../i18n';
import './images.css';

export default function Home() {
  const { user } = useAuth();
  const { t } = useLang();
  const { add, lines } = useCart();
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('All');
  const [params] = useSearchParams();
  const q = params.get('q') || '';   // search text typed in the header
  const isShop = user?.role === 'shopkeeper';
  const isAdmin = user?.role === 'admin';

  // Buy now: make sure this product is in the cart, then go straight to checkout
  const buyNow = p => {
    if (!lines.some(l => l.product.id === p.id)) add(p);
    nav('/cart');
  };

  // Refetch when login changes, because the server sends different prices per role
  useEffect(() => {
    setLoading(true); setErr('');
    api('/products').then(setProducts).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [user?.id]);

  const cats = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);
  const list = products.filter(p =>
    (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <section className="hero">
        <h1>{t('home.heroTitle')}</h1>
        <p>{t('home.heroSub')}</p>
      </section>

      {!user ? (
        <section>
          <h2>{t('home.who')}</h2>
          <div className="roles">
            <Link to="/login?mode=customer" className="role">
              <b>{t('home.customer')}</b>
              <span>{t('home.customerDesc')}</span>
            </Link>
            <Link to="/login?mode=shopkeeper" className="role">
              <b>{t('home.shopkeeper')}</b>
              <span>{t('home.shopkeeperDesc')}</span>
            </Link>
          </div>
        </section>
      ) : (
        <p className="note">
          {isShop ? t('home.noteWholesale') : t('home.noteRetail')}
        </p>
      )}

      <section>
        <div className="toolbar">
          <h2>{q ? t('home.resultsFor', { q }) : t('home.products')}</h2>
        </div>
        <div className="chips">
          {cats.map(c => (
            <button key={c} className={c === cat ? 'chip on' : 'chip'} onClick={() => setCat(c)}>{c === 'All' ? t('home.all') : c}</button>
          ))}
        </div>

        {loading && <p>{t('home.loadingProducts')}</p>}
        {err && <p className="err">{err}</p>}
        {!loading && !err && list.length === 0 && <p>{t('home.noProducts')}</p>}

        <div className="grid">
          {list.map(p => (
            <div className="card" key={p.id}>
              <div className="pimg">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy" /> : <span>{t('home.photoSoon')}</span>}
              </div>
              <div className="cat">{p.category}</div>
              <b>{p.name}</b>
              <div className="price">
                &#8377;{p.price}<span className="per"> / {p.unit}</span>
                {isShop && <s>&#8377;{p.retailPrice}</s>}
              </div>
              {isShop && <div className="min">{t('home.minOrder', { n: p.minQty, unit: p.unit })}</div>}
              {!p.inStock ? (
                <button className="btn" disabled>{t('home.outOfStock')}</button>
              ) : isAdmin ? (
                <div className="min">{t('home.adminNoOrder')}</div>
              ) : (
                <div className="btns">
                  <button className="btn alt" onClick={() => add(p)}>{t('home.addToCart')}</button>
                  <button className="btn" onClick={() => buyNow(p)}>{t('home.buyNow')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
