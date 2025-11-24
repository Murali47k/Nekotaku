// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const fetch = require('node-fetch');
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'db.json');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- Simple JSON DB helpers ---
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { anime: [], manga: [], topAnime: [], topManga: [], homeNotes: [] };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// ensure db exists
if (!fs.existsSync(DB_FILE)) {
  writeDB({ anime: [], manga: [], topAnime: [], topManga: [], homeNotes: [] });
}

// --- Helper: fetch poster/cover from Jikan API (MyAnimeList unofficial public API) ---
async function fetchPosterForAnime(title) {
  try {
    // Search anime by title
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    const json = await res.json();
    if (json && json.data && json.data.length > 0) {
      const item = json.data[0];
      // pick an image (jpg)
      const img = (item.images && item.images.jpg && item.images.jpg.large_image_url) || (item.images && item.images.jpg && item.images.jpg.image_url) || null;
      const year = item.year || (item.aired && item.aired.from ? new Date(item.aired.from).getFullYear() : null);
      const titleClean = item.title || title;
      return { poster: img, titleFetched: titleClean, year };
    }
  } catch (e) {
    console.warn('Jikan anime fetch failed', e);
  }
  return { poster: null, titleFetched: title, year: null };
}

async function fetchCoverForManga(title) {
  try {
    const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    const json = await res.json();
    if (json && json.data && json.data.length > 0) {
      const item = json.data[0];
      const img = (item.images && item.images.jpg && item.images.jpg.large_image_url) || (item.images && item.images.jpg && item.images.jpg.image_url) || null;
      const year = item.published && item.published.from ? new Date(item.published.from).getFullYear() : null;
      const titleClean = item.title || title;
      return { cover: img, titleFetched: titleClean, year };
    }
  } catch (e) {
    console.warn('Jikan manga fetch failed', e);
  }
  return { cover: null, titleFetched: title, year: null };
}

// --- API routes ---

// Read full DB (for debugging)
app.get('/api/db', (req, res) => {
  res.json(readDB());
});

// Home notes (about me paragraphs)
app.get('/api/home', (req, res) => {
  const db = readDB();
  res.json({ notes: db.homeNotes || [] });
});
app.post('/api/home', (req, res) => {
  const { text } = req.body;
  const db = readDB();
  db.homeNotes = db.homeNotes || [];
  db.homeNotes.push({ id: Date.now(), text });
  writeDB(db);
  res.json(db.homeNotes);
});

// Anime: list
app.get('/api/anime', (req, res) => {
  const db = readDB();
  res.json(db.anime || []);
});

// Add anime by title (server fetch poster)
app.post('/api/anime', async (req, res) => {
  const { title, seasons = 1, episodes_watched = 0, total_episodes = null, year = null } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const db = readDB();
  const fetched = await fetchPosterForAnime(title);
  const item = {
    id: Date.now().toString(),
    title: fetched.titleFetched || title,
    originalTitle: title,
    poster: fetched.poster,
    seasons: seasons,
    episodes_watched: episodes_watched,
    total_episodes: total_episodes,
    finished: false,
    year: year || fetched.year || null,
    addedAt: new Date().toISOString()
  };
  db.anime = db.anime || [];
  db.anime.push(item);
  writeDB(db);
  res.json(item);
});

// Update anime by id (PUT to replace fields)
app.put('/api/anime/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.anime = db.anime || [];
  const idx = db.anime.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const updated = Object.assign(db.anime[idx], req.body);
  db.anime[idx] = updated;
  writeDB(db);
  res.json(updated);
});

// Patch fields: mark finished, update episodes etc
app.patch('/api/anime/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.anime = db.anime || [];
  const idx = db.anime.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const item = db.anime[idx];
  if (req.body.hasOwnProperty('episodes_watched')) item.episodes_watched = req.body.episodes_watched;
  if (req.body.hasOwnProperty('seasons')) item.seasons = req.body.seasons;
  if (req.body.hasOwnProperty('total_episodes')) item.total_episodes = req.body.total_episodes;
  if (req.body.hasOwnProperty('finished')) item.finished = req.body.finished;
  if (req.body.hasOwnProperty('year')) item.year = req.body.year;
  db.anime[idx] = item;
  writeDB(db);
  res.json(item);
});

// Delete anime
app.delete('/api/anime/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.anime = db.anime || [];
  db.anime = db.anime.filter(a => a.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// Manga endpoints: similar
app.get('/api/manga', (req, res) => {
  const db = readDB();
  res.json(db.manga || []);
});

app.post('/api/manga', async (req, res) => {
  const { title, chapters_read = 0, total_chapters = null, year = null } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const db = readDB();
  const fetched = await fetchCoverForManga(title);
  const item = {
    id: Date.now().toString(),
    title: fetched.titleFetched || title,
    originalTitle: title,
    cover: fetched.cover,
    chapters_read,
    total_chapters,
    finished: false,
    year: year || fetched.year || null,
    addedAt: new Date().toISOString()
  };
  db.manga = db.manga || [];
  db.manga.push(item);
  writeDB(db);
  res.json(item);
});

app.put('/api/manga/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.manga = db.manga || [];
  const idx = db.manga.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const updated = Object.assign(db.manga[idx], req.body);
  db.manga[idx] = updated;
  writeDB(db);
  res.json(updated);
});

app.patch('/api/manga/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.manga = db.manga || [];
  const idx = db.manga.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const item = db.manga[idx];
  if (req.body.hasOwnProperty('chapters_read')) item.chapters_read = req.body.chapters_read;
  if (req.body.hasOwnProperty('total_chapters')) item.total_chapters = req.body.total_chapters;
  if (req.body.hasOwnProperty('finished')) item.finished = req.body.finished;
  if (req.body.hasOwnProperty('year')) item.year = req.body.year;
  db.manga[idx] = item;
  writeDB(db);
  res.json(item);
});

app.delete('/api/manga/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.manga = db.manga || [];
  db.manga = db.manga.filter(m => m.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// Top lists endpoints
app.get('/api/top/anime', (req, res) => {
  const db = readDB();
  res.json(db.topAnime || []);
});
app.post('/api/top/anime', (req, res) => {
  // expecting array of {title, reason}
  const { list } = req.body;
  const db = readDB();
  db.topAnime = Array.isArray(list) ? list.slice(0, 10) : [];
  writeDB(db);
  res.json(db.topAnime);
});

app.get('/api/top/manga', (req, res) => {
  const db = readDB();
  res.json(db.topManga || []);
});
app.post('/api/top/manga', (req, res) => {
  const { list } = req.body;
  const db = readDB();
  db.topManga = Array.isArray(list) ? list.slice(0, 10) : [];
  writeDB(db);
  res.json(db.topManga);
});

// Poster search helper endpoints (optional - frontend convenience)
app.get('/api/search/anime', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ results: [] });
  try {
    const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.json({ results: [] });
  }
});
app.get('/api/search/manga', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ results: [] });
  try {
    const r = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=5`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.json({ results: [] });
  }
});

// fallback to index.html for client side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
