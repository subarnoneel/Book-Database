# Book Database

A private catalogue of the books in our home library, with search by name, author, publisher or genre. Full Bangla (বাংলা) support.

- **Backend:** Node.js, Express 4, MongoDB (Mongoose 8). Lives in [`backend/`](backend/).
- **Frontend:** React 19, Vite, Tailwind CSS. Lives in [`frontend/`](frontend/).
- In production, the backend serves the built frontend, so the whole site is one web service.

## Running locally

Requirements: Node.js 20 or newer, and a MongoDB database (a free MongoDB Atlas cluster works).

1. **Install dependencies**
   ```sh
   npm install --prefix backend
   npm install --prefix frontend
   ```
2. **Configure the backend.** Copy `backend/.env.example` to `backend/.env` and fill it in:
   - `MONGO_URI`: your MongoDB connection string.
   - `JWT_SECRET`: any long random string. You can generate one with
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   - `ADMIN_USERNAME`: the login name for the website.
   - `ADMIN_PASSWORD_HASH`: generate it with `npm run hash-password --prefix backend -- "the-password"`.
3. **Start both servers** (in two terminals):
   ```sh
   npm run dev:backend    # API on http://localhost:5000
   npm run dev:frontend   # website on http://localhost:5173 (proxies /api to the backend)
   ```

## Deploying on Render

Create one **Web Service** from this repository:

| Setting | Value |
|---|---|
| Root directory | *(leave empty)* |
| Build command | `npm run build` |
| Start command | `npm start` |

Set these environment variables in the Render dashboard (never commit them):

- `NODE_ENV` = `production`
- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

In MongoDB Atlas, go to **Network Access** and allow connections from Render. Render's free plan has no fixed IP, so this usually means `0.0.0.0/0`. Because of that, use a strong, unique database password.

## API

All `/api/books` routes require you to be logged in. Login sets an httpOnly session cookie that lasts 30 days.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | `{ username, password }`. Limited to 10 attempts per 15 minutes. |
| GET | `/api/auth/me` | Returns the current user, or 401. |
| POST | `/api/auth/logout` | Clears the session. |
| GET | `/api/books?q=&genre=&sort=&order=&page=&limit=` | Search, filter, sort and paginate. `sort` is one of `name`, `author`, `publisher`, `genre`, `createdAt`. |
| GET | `/api/books/genres` | All distinct genres. |
| GET | `/api/books/:id` | Get one book. |
| POST | `/api/books` | Add a book: `{ name, author, publisher, genre }`. |
| PUT | `/api/books/:id` | Update any of those fields. |
| DELETE | `/api/books/:id` | Delete a book. |

Errors are always JSON in the form `{ message, errors? }`. `errors` maps field names to messages when validation fails.

## Bangla text

- Text is stored as UTF-8. Before saving and before searching, it is normalized to Unicode NFC, so letters like য়, ড় and ঢ় match no matter which keyboard produced them.
- Sorting uses Bangla collation, so books are listed in Bangla alphabetical order.
- The website bundles the *Noto Sans Bengali* font, so Bangla looks the same on every device.
