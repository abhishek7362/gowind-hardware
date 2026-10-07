import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, readUser, writeUser } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const save = ({ token, user }) => { setToken(token); writeUser(user); setUser(user); return user; };
  const logout = () => { setToken(null); writeUser(null); setUser(null); };

  useEffect(() => {
    window.addEventListener('gowind-logout', logout);
    return () => window.removeEventListener('gowind-logout', logout);
  }, []);

  const login = async (id, password) => save(await api('/auth/login', { method: 'POST', body: { id, password } }));
  const signup = async (name, mobile, password, email) =>
    save(await api('/auth/signup', { method: 'POST', body: { name, mobile, password, email } }));

  const updateAddress = async address => {
    const { user: u } = await api('/auth/address', { method: 'PATCH', body: { address } });
    writeUser(u); setUser(u);
    return u;
  };

  const updateEmail = async email => {
    const { user: u } = await api('/auth/email', { method: 'PATCH', body: { email } });
    writeUser(u); setUser(u);
    return u;
  };

  return <Ctx.Provider value={{ user, login, signup, logout, updateAddress, updateEmail }}>{children}</Ctx.Provider>;
}
