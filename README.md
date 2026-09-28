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
   - `GEMINI_API_KEY` (optional): enables book scanning. See [Book scanning](#book-scanning).
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
- `GEMINI_API_KEY` (for book scanning)

In MongoDB Atlas, go to **Network Access** and allow connections from Render. Render's free plan has no fixed IP, so this usually means `0.0.0.0/0`. Because of that, use a strong, unique database password.

## API

All `/api/books` routes require you to be logged in. Login sets an httpOnly session cookie that lasts 30 days.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | `{ username, password }`. Limited to 10 attempts per 15 minutes. |
| GET | `/api/auth/me` | Returns the current user, or 401. |
| POST | `/api/auth/logout` | Clears the session. |
| GET | `/api/books?q=&genre=&sort=&order=&page=&limit=` | Search, filter, sort and paginate. `sort` is one of `name`, `author`, `publisher`, `genre`, `createdAt`. |
| GET | `/api/books/meta` | Totals, genres with counts, and all authors and publishers (for autocomplete). |
| GET | `/api/books/:id` | Get one book. |
| POST | `/api/books` | Add a book: `{ name, author, genre, publisher? }` (publisher is optional). |
| PUT | `/api/books/:id` | Update any of those fields. |
| DELETE | `/api/books/:id` | Delete a book. |
| POST | `/api/scan` | `{ images: [{ data: <base64>, mimeType }] }` (1–3 photos). Returns the details read from the photos; saves nothing. |

Errors are always JSON in the form `{ message, errors? }`. `errors` maps field names to messages when validation fails.

## Book scanning

On the **Add a book** page, take or choose a photo of the cover or the title page (up to 3 photos of the same book). The photo is sent to Google Gemini, which reads the title, author, publisher and a suggested genre, and those fill in the form. Nothing is saved until you check the details and press **Add book**. Fields the AI was unsure about are marked **Check**.

How it works:
- The browser shrinks each photo to at most 1600 px before uploading.
- The backend (`backend/services/bookScanner.js`) sends the photos to Gemini with your existing authors, publishers and genres. Gemini answers in a fixed JSON format. Names that match an existing entry are returned with your library's spelling.
- The API key stays on the server and is never sent to the browser.

Setup:
- Create a key at [Google AI Studio](https://aistudio.google.com) and set `GEMINI_API_KEY` in `backend/.env` (and in Render).
- Optional: `GEMINI_MODELS` lists the models to try, in order. The default is `gemini-2.5-flash,gemini-3.8-flash,gemini-3.5-flash`. When a model is busy or over its quota, the next one is used.

Limits (Gemini API **free tier**):
- Each model allows a small number of requests per day, e.g. **20 per day for `gemini-2.5-flash`**. Limits reset at midnight US Pacific time. You can see your limits at [AI Studio → Rate limits](https://aistudio.google.com/rate-limit).
- The newer models are often "busy" on the free tier.
- For more scans, enable billing on the key's Google Cloud project. Scans then cost a fraction of a US cent each.

## Bangla text

- Text is stored as UTF-8. Before saving and before searching, it is normalized to Unicode NFC, so letters like য়, ড় and ঢ় match no matter which keyboard produced them.
- Sorting uses Bangla collation, so books are listed in Bangla alphabetical order.
- The website bundles the *Noto Sans Bengali* font, so Bangla looks the same on every device.
