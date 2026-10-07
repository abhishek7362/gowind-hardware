import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import MyOrders from './pages/MyOrders';
import './mobile.css';

export default function App() {
  return (
    <>
      <Header />
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="*" element={<p>Ye page nahi mila.</p>} />
        </Routes>
      </main>
      <footer className="foot">Gowind Hardware &nbsp;|&nbsp; Aapka hardware partner</footer>
    </>
  );
}
