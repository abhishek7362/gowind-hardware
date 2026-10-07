# Gowind Hardware - Backend

## Run
1. Install Node.js and MongoDB (or use a free MongoDB Atlas URI)
2. `npm install`
3. Copy `.env.example` to `.env` and fill it
4. `node seed.js`  (creates admin + sample products)
5. `npm run dev`

## API
- POST /api/auth/signup            customer signup {name, mobile, password}
- POST /api/auth/login             {id, password}  id = mobile or shop ID (GWD-1001)
- POST /api/auth/change-password   (login) {newPassword}
- GET  /api/products               guest/customer: retail price, shopkeeper: wholesale + minQty
- POST /api/products               (admin) add product
- PUT  /api/products/:id           (admin) edit product
- POST /api/admin/shopkeepers      (admin) {name, shopName} -> shop ID + temporary PIN
- GET  /api/admin/orders           (admin)
- PATCH /api/admin/orders/:id/status (admin) {status}
- POST /api/orders                 (login) {items:[{productId, qty}], paymentMode, address}
- GET  /api/orders/mine            (login)
- GET  /api/orders/udhaar/balance  (shopkeeper)
