import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, readUser, writeUser } from '../api';
import { useLang } from '../i18n';

export default function ChangePassword() {
  const nav = useNavigate();
  const { t } = useLang();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) return setErr(t('cp.mismatch'));
    try {
      await api('/auth/change-password', { method: 'POST', body: { newPassword: pw } });
      const u = readUser();
      if (u) writeUser({ ...u, mustChangePassword: false });
      nav('/');
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="panel">
      <h2>{t('cp.title')}</h2>
      <p className="note">{t('cp.note')}</p>
      <form onSubmit={submit}>
        <label>{t('cp.new')}<input type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} /></label>
        <label>{t('cp.again')}<input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn">{t('cp.btn')}</button>
      </form>
    </div>
  );
}
