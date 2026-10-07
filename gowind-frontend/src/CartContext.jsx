import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [lines, setLines] = useState([]);   // [{ product, qty }]

  // Prices depend on who is logged in, so start a fresh cart when the user changes
  useEffect(() => { setLines([]); }, [user?.id]);

  const minOf = p => p.minQty || 1;

  const add = p => setLines(ls => {
    const found = ls.find(l => l.product.id === p.id);
    return found
      ? ls.map(l => (l === found ? { ...l, qty: l.qty + 1 } : l))
      : [...ls, { product: p, qty: minOf(p) }];   // shopkeeper starts at minimum quantity
  });

  // Going below the minimum quantity removes the item
  const setQty = (id, qty) => setLines(ls => ls.flatMap(l =>
    l.product.id !== id ? [l] : qty < minOf(l.product) ? [] : [{ ...l, qty }]));

  // Reorder: add many products at once (quantity never below the minimum)
  const addMany = items => setLines(ls => {
    let next = [...ls];
    for (const { product, qty } of items) {
      const q = Math.max(qty, minOf(product));
      const i = next.findIndex(l => l.product.id === product.id);
      next = i >= 0
        ? next.map((l, k) => (k === i ? { ...l, qty: l.qty + q } : l))
        : [...next, { product, qty: q }];
    }
    return next;
  });

  const clear = () => setLines([]);
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return <Ctx.Provider value={{ lines, add, addMany, setQty, clear, total, count }}>{children}</Ctx.Provider>;
}
