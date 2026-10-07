# Gowind Hardware - Frontend (React + Vite)

1. Backend pehle chalao (`npm run dev` in gowind-backend, port 5000)
2. `npm install`
3. `npm run dev`  -> http://localhost:5173

`/api` calls Vite proxy ke through backend (port 5000) par jaati hain (vite.config.js).

## Pages
- `/` home: role cards, categories, products (price role ke hisaab se server se aati hai)
- `/login`: customer login, account banao, shopkeeper login (shop ID + PIN)
- `/change-password`: shopkeeper ka pehla temporary PIN badalna
- `/cart`: cart, minimum quantity, payment (udhaar sirf shopkeeper), order place
