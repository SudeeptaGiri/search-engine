````md
# MiniSearch — Build a Search Engine from Scratch

A simple educational search engine built with **TypeScript + Node.js**.

It shows the full search engine flow:

1. Crawl web pages (Wikipedia + Reddit)
2. Clean and process text
3. Build an inverted index
4. Rank results with BM25
5. Serve search + autocomplete APIs
6. Show results in a frontend UI

---

## 🚀 What this project teaches

This project is designed as a step-by-step learning path.

### 1) Project Setup & Config

- TypeScript setup
- Environment variables (`.env`)
- Redis + MongoDB connections
- Clean folder structure

### 2) Text Processing Pipeline

- Lowercase text
- Remove special characters
- Tokenize words
- Remove stop words
- Apply stemming

### 3) Inverted Index

- Core search structure: `term -> documents`
- Enables fast lookup instead of scanning all docs

### 4) Ranking (BM25)

- Scores documents by relevance
- Better than plain TF-IDF
- Handles term frequency + document length

### 5) Trie for Autocomplete

- Fast prefix search for suggestions
- Example: `jav -> javascript, java`

### 6) Web Crawler

- Crawls regular web pages (HTML)
- Crawls Reddit via `.json` endpoints
- Handles deduplication, rate limits, robots.txt

### 7) Search API

- `/search` for ranked results
- `/autocomplete` for term suggestions
- `/health` for system stats

### 8) Wiring Everything Together

- Crawler feeds index
- Index powers search
- Trie powers autocomplete
- API serves frontend

---

## 🧠 High-level flow

```text
URL -> Crawl -> Parse -> Process Text -> Index -> Rank -> API -> UI
```
````

Query flow:

```text
User Query -> Process Query -> Lookup Index -> BM25 Rank -> Return Results
```

---

## 🏗️ Tech stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **API:** Fastify
- **Queue:** BullMQ
- **Cache / Dedup / Rate control:** Redis
- **Storage:** MongoDB + Mongoose
- **HTML Parsing:** Cheerio
- **NLP:** natural (Porter stemmer)

---

## 📁 Project structure (short)

```text
src/
  config/       # app settings
  crawler/      # fetch + parse pages
  processing/   # tokenize, stopwords, stem
  indexer/      # inverted index + trie
  ranker/       # BM25 ranking
  search/       # query execution + snippets
  storage/      # redis + mongodb
  api/          # fastify routes
  utils/        # logger, url, hash helpers
```

---

## ⚙️ Environment variables

Create `.env`:

```env
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://localhost:27017/searchengine
CRAWLER_MAX_PAGES=2000
CRAWLER_USER_AGENT=MiniSearchBot/1.0
REDDIT_SUBREDDITS=programming,javascript,typescript,webdev,node,reactjs
```

---

## ▶️ Run locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start databases (Docker)

```bash
docker compose up -d
```

### 3. Start server

```bash
npx tsx src/index.ts
```

---

## 🔌 API endpoints

### Search

```http
GET /search?q=javascript&page=1&limit=10
```

### Autocomplete

```http
GET /autocomplete?q=jav
```

### Health

```http
GET /health
```

### Add crawl URLs

```http
POST /crawl
Content-Type: application/json
{
  "urls": ["https://en.wikipedia.org/wiki/JavaScript"]
}
```

### Add Reddit subreddits

```http
POST /crawl/reddit
Content-Type: application/json
{
  "subreddits": ["javascript", "typescript"]
}
```

---

## ✅ Tiny example snippet

Text processing idea:

```ts
"JavaScript is awesome!"
-> ["javascript", "awesom"]
```

This processed form is what gets indexed and searched.

---

## 📌 Notes

- This is an **educational search engine**, not production Google-scale.
- It focuses on clarity and architecture over scale.
- Great for learning crawling, indexing, and ranking fundamentals.

---

## 📚 Learning outcome

By finishing this project, you understand how a search engine works end-to-end:

- data collection
- NLP preprocessing
- indexing
- ranking
- API serving
- frontend integration

```

---

If you want, I can also generate:
1. a **professional README with badges + architecture diagram image section**, and
2. a **“Quick Demo GIF” section template** for GitHub.
```
