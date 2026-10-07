import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import './bell.css';
import { useLang } from '../i18n';

const ago = (d, t) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return t('time.min', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hour', { n: h });
  return new Date(d).toLocaleDateString();
};

// Bell icon with unread count. Owner sees new orders, customer/shopkeeper sees order status updates.
export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const ref = useRef(null);

  const load = useCallback(() => api('/notifications').then(setData).catch(() => {}), []);

  // check for new notifications now and then every 30 seconds
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load, user?.id]);

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => { if (!open) load(); setOpen(o => !o); };

  function openItem(n) {
    setOpen(false);
    if (!n.read) api(`/notifications/${n._id}/read`, { method: 'PATCH' }).then(load).catch(() => {});
    nav(user.role === 'admin' ? '/admin' : '/my-orders', { state: { tab: 'orders' } });
  }
  const readAll = () => api('/notifications/read-all', { method: 'POST' }).then(load).catch(() => {});

  return (
    <div className="bell" ref={ref}>
      <button className="bellbtn" onClick={toggle} aria-label="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {data.unread > 0 && <span className="badge">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>

      {open && (
        <div className="bdrop">
          <div className="bhead">
            <b>{t('bell.title')}</b>
            {data.unread > 0 && <button onClick={readAll}>{t('bell.readAll')}</button>}
          </div>
          {!data.items.length && <p className="bempty">{t('bell.empty')}</p>}
          {data.items.map(n => (
            <button key={n._id} className={n.read ? 'bitem' : 'bitem unread'} onClick={() => openItem(n)}>
              <b>{n.title}</b>
              <span>{n.message}</span>
              <small>{ago(n.createdAt, t)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
