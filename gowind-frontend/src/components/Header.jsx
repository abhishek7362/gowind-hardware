import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import './header.css';
import './usermenu.css';
import { useLang } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

// Delivery address with a small inline editor
function Address() {
  const { user, updateAddress } = useAuth();
  const { t } = useLang();
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(user.address || '');
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    try { await updateAddress(val); setEdit(false); setErr(''); }
    catch (ex) { setErr(ex.message); }
  }

  if (edit) return (
    <form className="addr-edit" onSubmit={save}>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder={t('addr.placeholder')} autoFocus />
      <button className="sm pri">{t('common.save')}</button>
      <button type="button" className="sm" onClick={() => setEdit(false)}>{t('common.cancel')}</button>
      {err && <span className="err">{err}</span>}
    </form>
  );
  return (
    <div className="addr">
      {t('addr.deliverTo')} <b>{user.address || t('addr.none')}</b>{' '}
      <button className="link" onClick={() => { setVal(user.address || ''); setEdit(true); }}>
        {user.address ? t('addr.change') : t('addr.add')}
      </button>
    </div>
  );
}

// Big search box. The text lives in the URL (?q=...), Home page reads it from there.
function SearchBar() {
  const nav = useNavigate();
  const { t } = useLang();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const urlQ = params.get('q') || '';
  const [q, setQ] = useState(urlQ);
  useEffect(() => { setQ(urlQ); }, [urlQ]);

  const go = (value, replace) => nav(value.trim() ? `/?q=${encodeURIComponent(value)}` : '/', { replace });

  return (
    <form className="bigsearch" onSubmit={e => { e.preventDefault(); go(q, false); }}>
      <input
        value={q}
        placeholder={t('search.placeholder')}
        onChange={e => { setQ(e.target.value); if (pathname === '/') go(e.target.value, true); }}
      />
      <button>{t('search.button')}</button>
    </form>
  );
}

// Account icon: click to open a small box with the user's info, address, orders and logout
function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const first = (user.name || '').trim().split(' ')[0];
  return (
    <div className="umenu" ref={ref}>
      <button className="uicon" onClick={() => setOpen(o => !o)} aria-label="Account" aria-expanded={open}>
        <span className="uav">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </span>
        <span className="uname">{first}</span>
        <span className="uarrow">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="udrop">
          <div className="u1">
            <b>{user.name}</b>
            {user.role === 'shopkeeper' && <span className="tag">{t('role.wholesale')}</span>}
            {user.role === 'admin' && <span className="tag">{t('role.admin')}</span>}
          </div>
          {user.role === 'shopkeeper' && <div className="u2">{user.shopName} &middot; {user.shopId}</div>}
          {user.role === 'customer' && user.mobile && <div className="u2">{t('user.mobile')} {user.mobile}</div>}
          {user.role !== 'admin' && <Address key={user.id} />}
          <div className="umlinks">
            {user.role !== 'admin'
              ? <Link to="/my-orders" onClick={() => setOpen(false)}>{t('menu.myOrders')}</Link>
              : <span />}
            <button onClick={logout}>{t('menu.logout')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t } = useLang();
  return (
    <header className="hdr">
      <div className="wrap hdr-row">
        <Link to="/" className="brand">
          <img src="/logo-icon.png" alt="Gowind Hardware logo" className="logo-img" />
          <span>
            <b>Gowind Hardware</b>
            <small>{t('brand.tagline')}</small>
          </span>
        </Link>
        <div className="grow" />

        <LanguageSwitcher />
        {user ? (
          <>
            <NotificationBell />
            <UserMenu />
          </>
        ) : (
          <Link to="/login" className="loginbtn">{t('nav.login')}</Link>
        )}

        <div className="acts">
          {user?.role === 'admin' && <Link to="/admin" className="cartbtn">{t('nav.adminPanel')}</Link>}
          <Link to="/cart" className="cartbtn">{t('nav.cart')} ({count})</Link>
        </div>
      </div>
      <div className="wrap"><SearchBar /></div>
    </header>
  );
}
