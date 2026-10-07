import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n';
import './lang.css';

// Globe icon + current language. Click to pick another language.
export default function LanguageSwitcher() {
  const { lang, setLang, languages } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const cur = languages.find(l => l.code === lang);
  return (
    <div className="lang" ref={ref}>
      <button className="langbtn" onClick={() => setOpen(o => !o)} aria-label="Language" aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20" />
        </svg>
        <span className="langname">{cur.label}</span>
      </button>
      {open && (
        <div className="ldrop">
          {languages.map(l => (
            <button key={l.code} className={l.code === lang ? 'litem on' : 'litem'} onClick={() => { setLang(l.code); setOpen(false); }}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
