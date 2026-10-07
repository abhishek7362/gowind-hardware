import { createContext, useContext, useEffect, useState } from 'react';
import en from './en';
import hi from './hi';

// NAYI BHASHA JODNE KE LIYE: hi.js ko copy karke naya naam do (jaise pa.js), right side ka text translate karo,
// phir yahan import karo aur neeche list mein ek line jodo. Jo key translate nahi hogi wo English dikhegi.
export const LANGUAGES = [
  { code: 'en', label: 'English', dict: en },
  { code: 'hi', label: 'हिन्दी', dict: hi }
];

const KEY = 'gowind_lang';
const Ctx = createContext(null);
export const useLang = () => useContext(Ctx);

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGUAGES.some(l => l.code === saved)) return saved;
  } catch {}
  return (navigator.language || '').toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(initial);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch {}
  }, [lang]);

  const dict = LANGUAGES.find(l => l.code === lang).dict;

  // t('home.minOrder', { n: 5, unit: 'kg' }) -> text with {n} and {unit} filled in.
  // Missing key falls back to English, then to the key itself.
  const t = (key, vars) => {
    let s = dict[key] ?? en[key] ?? key;
    if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  };

  return <Ctx.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>{children}</Ctx.Provider>;
}
