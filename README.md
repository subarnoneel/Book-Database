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
   - `GOOGLE_VERTEX_API_KEY` and/or `GEMINI_API_KEY` (optional): enable book scanning. See [Book scanning](#book-scanning).
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
- `GOOGLE_VERTEX_API_KEY` and `GEMINI_API_KEY` (for book scanning)

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
| GET | `/api/books/values?field=author|publisher|genre` | Each distinct value of that field, with its book count. |
| POST | `/api/books/bulk-rename` | `{ field, from, to }`: changes `from` to `to` on every book with that exact value, merging if `to` already exists. Publisher can be cleared with `to: ""`. |
| GET | `/api/books/duplicates?name=&author=&alt=&excludeId=` | Books that may be the same as the given title/author (see [Duplicate detection](#duplicate-detection)). |
| GET | `/api/books/export/pdf` | Every book as a PDF table (A4 landscape, sorted by title). |
| GET | `/api/books/:id` | Get one book. |
| POST | `/api/books` | Add a book: `{ name, author, genre, publisher? }` (publisher is optional). Answers **409** with `duplicates` if it looks like a book already in the library, unless `allowDuplicate: true` is sent. |
| PUT | `/api/books/:id` | Update any of those fields. The same duplicate check applies when the title or author changes. |
| DELETE | `/api/books/:id` | Delete a book. |
| GET | `/api/scan/usage` | This month's Cloud scans and estimated spend. |
| POST | `/api/scan` | `{ images: [{ data: <base64>, mimeType }] }` (1–3 photos). Returns the details read from the photos; saves nothing. |

Errors are always JSON in the form `{ message, errors? }`. `errors` maps field names to messages when validation fails.

## Downloading and tidying up

- **Download PDF** (Library page): a printable table of every book with its title, author, publisher, genre and date added. It is built on the server with `pdfkit`, using the bundled Noto Sans Bengali font (`backend/assets/fonts`, SIL Open Font License), so Bangla conjuncts print correctly.
- **Tidy up** page: rename an author, publisher or genre on all of its books at once. Use it when a publisher changes its name, or to merge two spellings (e.g. "fantasy" and "Fantasy"). Renaming to a name that already exists merges the two groups, and the dialog warns before doing so. There is no undo, so download a PDF first as a record.

## Duplicate detection

While a book is being added or edited, the form checks the library for the same book, both as you type and right after a photo scan fills the form. Matches appear under the Title field. Saving a likely duplicate asks **"Add anyway?"**, since a second copy or another edition is sometimes intended. The server enforces the same check, so a book can't slip through by saving too quickly.

Matching (`backend/services/duplicateFinder.js`):
- **Normalising.** Titles are compared ignoring case, spaces, punctuation and a leading "the/a/an". Bangla digits count as numbers.
- **Bangla spelling variants.** These are treated as the same: ি/ী, ু/ূ, শ/ষ/স, ণ/ন, য়/য, ড়/ঢ়/র, chandrabindu, and composed/decomposed letters.
- **What counts as a duplicate:**
  - *Duplicate*: the same title and author.
  - *Likely*: a typo or an added subtitle, with the same author. Titles that differ only by a number ("Class 7" vs "Class 8") are never flagged.
- **Series volumes** are recognised: "খণ্ড ২", "২য় খণ্ড", "দ্বিতীয় খণ্ড", "Vol. 2", "Part II" and a trailing number all mean volume 2. A different volume of the same series is shown as information ("you also have volumes 1 and 3"), not as a duplicate.
- **Other script.** Bangla vs English spellings of the same title ("Pather Panchali" vs পথের পাঁচালী) are matched through a rough transliteration. When a book is scanned, Gemini also returns the work's other known titles (e.g. its translated title), which are checked too.
- **Same title, different author** is shown as a note only. One-word generic titles ("কবিতা") by different authors are ignored.

Run the matcher's tests with `npm test --prefix backend`.

## Book scanning

On the **Add a book** page, take or choose a photo of the cover or the title page (up to 3 photos of the same book). The photo is sent to Google Gemini, which reads the title, author, publisher and a suggested genre, and those fill in the form. Nothing is saved until you check the details and press **Add book**. Fields the AI was unsure about are marked **Check**.

How it works:
- The browser shrinks each photo to at most 1600 px before uploading.
- The backend (`backend/services/bookScanner.js`) sends the photos to Gemini with your existing authors, publishers and genres. Gemini answers in a fixed JSON format. Names that match an existing entry are returned with your library's spelling.
- The API key stays on the server and is never sent to the browser.

Two ways to reach Gemini are supported, tried in this order:

1. **Google Cloud (Agent Platform / Vertex AI)**, using `GOOGLE_VERTEX_API_KEY`. This route is paid per scan, and the cost is covered by the Google Cloud credit. It is reliable and has no daily limit. A scan costs roughly $0.002–0.003, so $8 covers about 3,000 scans.
2. **Gemini API free tier**, using `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com). It allows about 20 scans per day per model, the newer models are often busy, and limits reset at midnight US Pacific time. It is used as a backup.

**Monthly budget.** The server estimates the cost of every Cloud scan from the token counts Gemini returns, using the prices in `backend/services/scanUsage.js`. It stops using the Cloud key once the month's total reaches `SCAN_MONTHLY_BUDGET_USD` (default **$8**, below the $10 monthly credit). After that it switches to the free tier until the next month. The scan panel on the Add page shows this month's scans and estimated spend. `GET /api/scan/usage` returns the same numbers.

Optional settings:
- `GEMINI_CLOUD_MODELS`: the Cloud models to try, in order. Default: `gemini-3.8-flash,gemini-2.5-flash,gemini-3.5-flash`.
- `GEMINI_MODELS`: the free-tier models to try, in order. Default: `gemini-2.5-flash,gemini-3.8-flash,gemini-3.5-flash`.

When a model is busy or over its limit, the next one is used.

**Checking real usage in Google Cloud Console:**
- **Billing → Credits:** how much of the credit is left.
- **Billing → Reports:** filter by the Vertex AI service and confirm the cost after credits is $0.
- **Billing → Budgets & alerts:** email alerts.
- **APIs & Services → Vertex AI API → Metrics:** request counts and errors.

## Bangla text

- Text is stored as UTF-8. Before saving and before searching, it is normalized to Unicode NFC, so letters like য়, ড় and ঢ় match no matter which keyboard produced them.
- Sorting uses Bangla collation, so books are listed in Bangla alphabetical order.
- The website bundles the *Noto Sans Bengali* font, so Bangla looks the same on every device.
