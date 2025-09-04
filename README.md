# Product Management App (Node.js + Express + PostgreSQL)

A minimal full‑stack app for managing products with user authentication (JWT) and admin‑only CRUD operations. The backend is built with Express 5 and PostgreSQL; the frontend is a small vanilla HTML/CSS/JS app served statically.

## Tech Stack
- Backend: Node.js, Express 5, CommonJS modules
- Database: PostgreSQL (`pg`)
- Auth: JWT (`jsonwebtoken`), password hashing via `bcryptjs`
- Input validation: `express-validator`
- Config: `dotenv`, CORS via `cors`
- Frontend: Static HTML, CSS, and vanilla JS (`fetch`) in `public/`
- Dev tooling: `nodemon`

## Features
- User registration and login with JWT
- Admin seeding on first run (configurable via env)
- Public product listing; admin‑only create/update/delete
- Basic request validation and error handling
- Simple, framework‑free frontend

## Project Structure
```
.
├─ src/
│  ├─ server.js           # Express app + static hosting
│  ├─ db.js               # PostgreSQL pool, auto DB/table setup, admin seed
│  ├─ middleware/
│  │  └─ auth.js          # JWT auth + admin guards
│  └─ routes/
│     ├─ auth.js          # /api/auth routes (register/login/me)
│     └─ products.js      # /api/products CRUD
├─ public/
│  ├─ index.html          # UI
│  ├─ style.css           # Styles
│  └─ app.js              # Frontend logic, API calls
├─ .env                   # Local environment (do NOT commit)
├─ package.json
└─ README.md
```

## Getting Started
### Prerequisites
- Node.js (18+ recommended)
- npm
- PostgreSQL server (local or remote)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (see variables below).
3. Ensure your PostgreSQL server is running and the configured user has permission to create databases (used for auto‑provisioning). Otherwise, create the database manually and keep `DB_NAME` consistent.

### Run
- Development (auto‑reload):
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm start
  ```
- App runs at: `http://localhost:3000`

## Environment Variables (.env)
```
# Server
PORT=3000
JWT_SECRET=change_me_in_production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Product_DB
DB_USER=postgres
DB_PASSWORD=your_password_here

# Admin seed (created on first run if no admin exists)
SEED_ADMIN_EMAIL=admin@local.test
SEED_ADMIN_PASSWORD=admin123
```
Notes:
- On startup, the app connects to the default `postgres` database to create `DB_NAME` if it doesn't exist, then creates tables and seeds an admin user if none exists.
- Ensure `DB_USER` has privileges to create databases, or pre‑create `DB_NAME` and keep credentials consistent.
- Do NOT commit `.env` to GitHub.

## API Reference
Base URL: `/api`

### Auth
- POST `/auth/register`
  - Body: `{ "email": string, "password": string (min 6) }`
  - Returns: `{ token, user }`
- POST `/auth/login`
  - Body: `{ "email": string, "password": string }`
  - Returns: `{ token, user }`
- GET `/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

### Products
- GET `/products`
  - Public: list all products
- GET `/products/:id`
  - Public: get one product by id
- POST `/products`
  - Admin only; Headers: `Authorization: Bearer <token)`
  - Body: `{ name: string, description?: string, price: number >= 0, stock: number >= 0 }`
  - Returns: `{ product }`
- PUT `/products/:id`
  - Admin only; Headers: `Authorization: Bearer <token)`
  - Body: Partial update of any of: `name`, `description`, `price`, `stock`
  - Returns: `{ product }`
- DELETE `/products/:id`
  - Admin only; Headers: `Authorization: Bearer <token)`
  - Returns: `{ success: true }`

## Frontend
- Served statically from `public/`.
- Visit `http://localhost:3000/` to use the UI.
- Login with the seeded admin (see `.env`) or register a new user.
- Admins can create, edit, and delete products from the UI.

## Scripts
- `npm run dev`: Start with `nodemon` for auto‑reload during development
- `npm start`: Start the server

## Security Notes
- Do not commit your `.env` to source control.
- Always set a strong `JWT_SECRET` in production.
- CORS is enabled globally; restrict origins for production deployments.

## Troubleshooting
- Cannot connect to DB: verify PostgreSQL is running and `.env` credentials are correct.
- DB not created: ensure `DB_USER` has `CREATEDB` privilege or create `DB_NAME` manually.
- Port already in use: change `PORT` in `.env` or stop the conflicting process.
- Node version issues: upgrade to a current LTS (18+) and reinstall dependencies.

## Quick Hindi Summary (Optional)
Yeh project Node.js + Express backend aur PostgreSQL database use karta hai. Frontend simple HTML/CSS/JS hai jo server se serve hota hai. JWT based login/registration hai, aur sirf admin users products create/update/delete kar sakte hain. Setup ke liye `.env` banayein, `npm install` karein, aur `npm run dev` se app chalayen.

## License
ISC (see `package.json`).

