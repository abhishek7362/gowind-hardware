import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLang } from '../i18n';

export default function Login() {
  const { login, signup } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'shopkeeper' ? 'shop' : 'login'); // login | signup | shop
  const [f, setF] = useState({ name: '', id: '', password: '', email: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = mode === 'signup'
        ? await signup(f.name.trim(), f.id.trim(), f.password, f.email.trim())
        : await login(f.id.trim(), f.password);
      nav(u.mustChangePassword ? '/change-password' : '/');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="tabs">
        <button className={mode === 'login' ? 'tab on' : 'tab'} onClick={() => setMode('login')}>{t('login.tabCustomer')}</button>
        <button className={mode === 'signup' ? 'tab on' : 'tab'} onClick={() => setMode('signup')}>{t('login.tabSignup')}</button>
        <button className={mode === 'shop' ? 'tab on' : 'tab'} onClick={() => setMode('shop')}>{t('login.tabShop')}</button>
      </div>

      <form onSubmit={submit}>
        {mode === 'shop' && <p className="note">{t('login.shopNote')}</p>}
        {mode === 'signup' && (
          <label>{t('login.fullName')}<input value={f.name} onChange={set('name')} required /></label>
        )}
        <label>
          {mode === 'shop' ? t('login.shopId') : t('login.mobile')}
          <input value={f.id} onChange={set('id')} required />
        </label>
        <label>
          {mode === 'shop' ? t('login.pin') : t('login.password')}
          <input type="password" value={f.password} onChange={set('password')} required minLength={mode === 'signup' ? 6 : 1} />
        </label>
        {mode === 'signup' && (
          <label>{t('login.emailOpt')}
            <input type="email" value={f.email} onChange={set('email')} placeholder="aap@gmail.com" />
          </label>
        )}
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy}>
          {busy ? t('common.wait') : mode === 'signup' ? t('login.btnSignup') : t('login.btnLogin')}
        </button>
      </form>
    </div>
  );
}
