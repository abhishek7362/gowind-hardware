import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, upload } from '../api';
import { useAuth } from '../AuthContext';
import './admin.css';
import './images.css';
import { useLang } from '../i18n';

export default function Admin() {
  const { t } = useLang();
  const { user } = useAuth();
  const loc = useLocation();
  const [tab, setTab] = useState(loc.state?.tab || 'shops');      // bell icon opens the Orders tab
  useEffect(() => { if (loc.state?.tab) setTab(loc.state.tab); }, [loc.key]);
  if (user?.role !== 'admin')
    return <p>{t('admin.onlyOwner')} <Link to="/login" className="link">{t('admin.loginLink')}</Link></p>;
  return (
    <>
      <div className="atabs">
        {[['shops', t('admin.tabShops')], ['products', t('admin.tabProducts')], ['orders', t('admin.tabOrders')]].map(([k, label]) => (
          <button key={k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'shops' && <Shops />}
      {tab === 'products' && <Products />}
      {tab === 'orders' && <Orders />}
    </>
  );
}

/* ---------- Shopkeepers ---------- */
function Shops() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name: '', shopName: '' });
  const [got, setGot] = useState(null);   // { shopId, tempPin }
  const [err, setErr] = useState('');
  const load = () => api('/admin/shopkeepers').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault(); setErr('');
    try {
      setGot(await api('/admin/shopkeepers', { method: 'POST', body: f }));
      setF({ name: '', shopName: '' }); load();
    } catch (e2) { setErr(e2.message); }
  }
  async function reset(shopId) {
    if (!window.confirm(t('admin.confirmReset', { id: shopId }))) return;
    try { setGot(await api(`/admin/shopkeepers/${shopId}/reset-pin`, { method: 'POST' })); } catch (e2) { setErr(e2.message); }
  }
  async function toggle(s) {
    try { await api(`/admin/shopkeepers/${s._id}/active`, { method: 'PATCH', body: { isActive: !s.isActive } }); load(); }
    catch (e2) { setErr(e2.message); }
  }

  return (
    <>
      <form className="box" onSubmit={create}>
        <h3>{t('admin.addShop')}</h3>
        <div className="frow">
          <label>{t('admin.shopkeeperName')}<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></label>
          <label>{t('admin.shopName')}<input value={f.shopName} onChange={e => setF({ ...f, shopName: e.target.value })} required /></label>
          <button className="btn" style={{ marginTop: 0 }}>{t('admin.makeId')}</button>
        </div>
        {got && (
          <div className="got">
            {t('admin.shopIdLabel')} <b>{got.shopId}</b> &nbsp; {t('admin.pinLabel')} <b>{got.tempPin}</b><br />
            {t('admin.pinOnce')}
          </div>
        )}
        {err && <p className="err">{err}</p>}
      </form>

      <div className="box">
        <h3>{t('admin.allShops', { n: list.length })}</h3>
        {!list.length && <p className="note">{t('admin.noShops')}</p>}
        {list.map(s => (
          <ShopRow key={s._id} s={s} onReset={reset} onToggle={toggle} onChanged={load} onErr={setErr} />
        ))}
      </div>
    </>
  );
}

function ShopRow({ s, onReset, onToggle, onChanged, onErr }) {
  const { t } = useLang();
  const [pay, setPay] = useState(false);
  const [amt, setAmt] = useState('');
  const [kh, setKh] = useState(null);   // khata entries when open

  async function save(e) {
    e.preventDefault();
    try {
      await api(`/admin/shopkeepers/${s._id}/payment`, { method: 'POST', body: { amount: Number(amt) } });
      setPay(false); setAmt(''); setKh(null); onChanged();
    } catch (ex) { onErr(ex.message); }
  }
  async function khata() {
    if (kh) return setKh(null);
    try { setKh(await api(`/admin/shopkeepers/${s._id}/ledger`)); } catch (ex) { onErr(ex.message); }
  }

  return (
    <div className={s.isActive ? 'arow' : 'arow off'}>
      <span className="nm">
        <b>{s.shopId}</b> &nbsp; {s.shopName} ({s.name})<br />
        <small>{t('admin.balance')} <b>&#8377;{s.balance}</b></small>
      </span>
      <button className="sm pri" onClick={() => setPay(!pay)}>{t('admin.takePayment')}</button>
      <button className="sm" onClick={khata}>{t('admin.ledger')}</button>
      <button className="sm" onClick={() => onReset(s.shopId)}>{t('admin.resetPin')}</button>
      <button className="sm" onClick={() => onToggle(s)}>{s.isActive ? t('admin.deactivate') : t('admin.activate')}</button>
      {pay && (
        <form className="items" onSubmit={save}>
          <input type="number" min="1" style={{ width: 170 }} value={amt} onChange={e => setAmt(e.target.value)} placeholder={t('admin.amountPh')} required />{' '}
          <button className="sm pri">{t('admin.record')}</button>
        </form>
      )}
      {kh && (
        <div className="items">
          {kh.length ? kh.map(k => (
            <div key={k._id}>{new Date(k.createdAt).toLocaleDateString()} &nbsp; {k.type === 'debit' ? '+' : '-'}&#8377;{k.amount} &nbsp; {k.note}</div>
          )) : t('admin.noEntries')}
        </div>
      )}
    </div>
  );
}

/* ---------- Products ---------- */

function CategoryBox({ cats, onDone, onErr }) {
  const { t } = useLang();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  async function go(e) {
    e.preventDefault();
    try { await api('/admin/categories', { method: 'PATCH', body: { from, to } }); setFrom(''); setTo(''); onDone(); }
    catch (ex) { onErr(ex.message); }
  }
  return (
    <form className="box" onSubmit={go}>
      <h3>{t('admin.rename')}</h3>
      <div className="frow">
        <label>{t('admin.oldCat')}
          <select value={from} onChange={e => setFrom(e.target.value)} required>
            <option value="">{t('admin.choose')}</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>{t('admin.newSpelling')}<input value={to} onChange={e => setTo(e.target.value)} required /></label>
        <button className="btn" style={{ marginTop: 0 }}>{t('admin.renameBtn')}</button>
      </div>
      <small>{t('admin.renameNote')}</small>
    </form>
  );
}
const UNITS = ['pcs', 'kg', 'bag', 'meter', 'feet', 'litre', 'box', 'packet', 'set', 'dozen'];
const emptyP = { name: '', category: '', retailPrice: '', wholesalePrice: '', unit: 'pcs', minQty: 1, stock: 0 };

function ProductRow({ p, onSaved, onErr }) {
  const { t } = useLang();
  const [v, setV] = useState({ retailPrice: p.retailPrice, wholesalePrice: p.wholesalePrice, minQty: p.minQty, stock: p.stock, unit: p.unit || 'pcs' });
  const set = k => e => setV({ ...v, [k]: e.target.value });
  const [busy, setBusy] = useState(false);
  const pick = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    setBusy(true);
    try { await upload(`/admin/products/${p._id}/image`, fd); onSaved(); }
    catch (er) { onErr(er.message); }
    finally { setBusy(false); }
  };
  const save = async patch => {
    try {
      await api('/products/' + p._id, { method: 'PUT', body: {
        retailPrice: Number(v.retailPrice), wholesalePrice: Number(v.wholesalePrice),
        minQty: Number(v.minQty), stock: Number(v.stock), unit: (v.unit || '').trim() || 'pcs', ...patch } });
      onSaved();
    } catch (e) { onErr(e.message); }
  };
  return (
    <div className={p.isActive ? 'arow' : 'arow off'}>
      <label className="thumb" title={t('admin.changePhoto')}>
        {busy ? '...' : p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span>{t('admin.addPhoto')}</span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden />
      </label>
      <span className="nm"><b>{p.name}</b><br /><small>{p.category}</small></span>
      <label>{t('admin.rowRetail')}<input type="number" value={v.retailPrice} onChange={set('retailPrice')} /></label>
      <label>{t('admin.rowWholesale')}<input type="number" value={v.wholesalePrice} onChange={set('wholesalePrice')} /></label>
      <label>{t('admin.rowUnit')}<input list="units" value={v.unit} onChange={set('unit')} style={{ width: 70 }} /></label>
      <label>{t('admin.rowMin')}<input type="number" value={v.minQty} onChange={set('minQty')} /></label>
      <label>{t('admin.pStock')}<input type="number" value={v.stock} onChange={set('stock')} /></label>
      <button className="sm pri" onClick={() => save({})}>{t('common.save')}</button>
      <button className="sm" onClick={() => save({ isActive: !p.isActive })}>{p.isActive ? t('admin.hide') : t('admin.show')}</button>
    </div>
  );
}

function Products() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [f, setF] = useState(emptyP);
  const [err, setErr] = useState('');
  const load = () => api('/admin/products').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const cats = [...new Set(list.map(p => p.category))].sort();

  async function add(e) {
    e.preventDefault(); setErr('');
    try {
      await api('/products', { method: 'POST', body: {
        name: f.name.trim(), category: f.category.trim(),
        retailPrice: Number(f.retailPrice), wholesalePrice: Number(f.wholesalePrice),
        minQty: Number(f.minQty), unit: f.unit.trim() || 'pcs', stock: Number(f.stock) } });
      setF(emptyP); load();
    } catch (e2) { setErr(e2.message); }
  }

  return (
    <>
      <form className="box" onSubmit={add}>
        <h3>{t('admin.addProduct')}</h3>
        <div className="frow">
          <label>{t('admin.pName')}<input value={f.name} onChange={set('name')} required /></label>
          <label>{t('admin.pCategory')}
            <input list="cats" value={f.category} onChange={set('category')} placeholder={t('admin.pCategoryPh')} required />
            <datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist>
          </label>
          <label>{t('admin.pRetailUnit')}<input type="number" min="0" value={f.retailPrice} onChange={set('retailPrice')} required /></label>
          <label>{t('admin.pWholesaleUnit')}<input type="number" min="0" value={f.wholesalePrice} onChange={set('wholesalePrice')} required /></label>
          <label>{t('admin.pUnit')}
            <input list="units" value={f.unit} onChange={set('unit')} required />
            <datalist id="units">{UNITS.map(u => <option key={u} value={u} />)}</datalist>
          </label>
          <label>{t('admin.pMinQty')}<input type="number" min="1" value={f.minQty} onChange={set('minQty')} required /></label>
          <label>{t('admin.pStock')}<input type="number" min="0" value={f.stock} onChange={set('stock')} required /></label>
          <button className="btn" style={{ marginTop: 0 }}>{t('admin.addProductBtn')}</button>
        </div>
        {err && <p className="err">{err}</p>}
      </form>
      <CategoryBox cats={cats} onDone={load} onErr={setErr} />
      <div className="box">
        <h3>{t('admin.allProducts', { n: list.length })}</h3>
        {list.map(p => <ProductRow key={p._id + p.updatedAt} p={p} onSaved={load} onErr={setErr} />)}
      </div>
    </>
  );
}

/* ---------- Orders ---------- */
const STATUSES = ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'];

function Orders() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const load = () => api('/admin/orders').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    if (status === 'cancelled' && !window.confirm(t('admin.confirmCancel'))) return;
    try { await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="box">
      <h3>{t('admin.orders', { n: list.length })}</h3>
      {err && <p className="err">{err}</p>}
      {!list.length && <p className="note">{t('admin.noOrders')}</p>}
      {list.map(o => (
        <div className="arow" key={o._id}>
          <span className="nm">
            <b>{o.user?.shopName ? `${o.user.shopName} (${o.user.shopId})` : o.user?.name}</b>
            <br /><small>{new Date(o.createdAt).toLocaleString()} &nbsp; {o.buyerType} &nbsp; {t('pay.' + o.paymentMode)}</small>
          </span>
          <b>&#8377;{o.total}</b>
          <select value={o.status} disabled={o.status === 'cancelled'} onChange={e => setStatus(o._id, e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{t('status.' + s)}</option>)}
          </select>
          <span className="items">
            {o.items.map(i => `${i.name} x ${i.qty}${i.unit ? ' ' + i.unit : ''}`).join(', ')}
            {o.address ? ` | ${t('admin.addressLabel')} ${o.address}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
