const TOKEN_KEY = 'gowind_token';
const USER_KEY = 'gowind_user';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };
export const readUser = () => { try { return getToken() ? JSON.parse(localStorage.getItem(USER_KEY)) : null; } catch { return null; } };
export const writeUser = u => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };

// Every call to the backend goes through here (adds the login token automatically)
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Server se connect nahi ho paa raha. Backend chal raha hai?');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {          // token expired or invalid
    setToken(null); writeUser(null);
    window.dispatchEvent(new Event('gowind-logout'));
  }
  if (!res.ok) throw new Error(data.error || 'Kuch galat ho gaya');
  return data;
}

// File upload (FormData). Browser sets the content type itself.
export async function upload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch('/api' + path, { method: 'POST', headers, body: formData });
  } catch {
    throw new Error('Server se connect nahi ho paa raha. Backend chal raha hai?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Photo upload nahi hui');
  return data;
}
