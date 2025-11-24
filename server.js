// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const fetch = require('node-fetch');
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'db.json');
const POSTERS_DIR = path.join(__dirname, 'public', 'posters');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('tiny'));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ensure posters dir exists
if (!fs.existsSync(POSTERS_DIR)) fs.mkdirSync(POSTERS_DIR, { recursive: true });

// --- Simple JSON DB helpers ---
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { anime: [], manga: [], topAnime: [], topManga: [], homeNotes: [], yearSections: { anime: [], manga: [] } };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// ensure db exists
if (!fs.existsSync(DB_FILE)) {
  writeDB({
    anime: [],
    manga: [],
    topAnime: [],
    topManga: [],
    homeNotes: [{ id: 1, text: "Add your 'about me' paragraphs from the Home page UI by clicking the 'Add note' button." }],
    yearSections: { anime: [], manga: [] }
  });
}

// Helper: download image to local path
async function downloadImageToPath(url, filepath) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.buffer();
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, buffer);
    const rel = path.relative(path.join(__dirname, 'public'), filepath).split(path.sep).join('/');
    return `/${rel}`;
  } catch (e) {
    console.warn('download failed', e);
    return null;
  }
}

// Jikan search helper (get poster url, title, year)
async function fetchPosterForAnime(title) {
  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    const json = await res.json();
    if (json && json.data && json.data.length > 0) {
      const item = json.data[0];
      const img = (item.images && item.images.jpg && (item.images.jpg.large_image_url || item.images.jpg.image_url)) || null;
      const year = item.year || (item.aired && item.aired.from ? new Date(item.aired.from).getFullYear() : null);
      const mal_id = item.mal_id || null;
      const titleClean = item.title || title;
      return { poster: img, titleFetched: titleClean, year, mal_id };
    }
  } catch (e) {
    console.warn('Jikan anime fetch failed', e);
  }
  return { poster: null, titleFetched: title, year: null, mal_id: null };
}

// --- API routes ---

// Read full DB
app.get('/api/db', (req, res) => {
  res.json(readDB());
});

// Home notes
app.get('/api/home', (req, res) => {
  const db = readDB();
  res.json({ notes: db.homeNotes || [], topAnime: db.topAnime || [], topManga: db.topManga || [] });
});
app.post('/api/home', (req, res) => {
  const { text } = req.body;
  const db = readDB();
  db.homeNotes = db.homeNotes || [];
  db.homeNotes.push({ id: Date.now(), text });
  writeDB(db);
  res.json(db.homeNotes);
});

// Year sections
app.get('/api/years/:type', (req, res) => {
  const type = req.params.type; // 'anime' or 'manga'
  const db = readDB();
  db.yearSections = db.yearSections || { anime: [], manga: [] };
  res.json(db.yearSections[type] || []);
});
app.post('/api/years/:type', (req, res) => {
  const type = req.params.type;
  const { yearLabel } = req.body;
  if (!yearLabel) return res.status(400).json({ error: 'yearLabel required' });
  const db = readDB();
  db.yearSections = db.yearSections || { anime: [], manga: [] };
  if (!db.yearSections[type]) db.yearSections[type] = [];
  if (!db.yearSections[type].includes(yearLabel)) db.yearSections[type].push(yearLabel);
  writeDB(db);
  res.json(db.yearSections[type]);
});
// DELETE a year-section (remove all anime/manga in that yearSection)
app.delete('/api/years/:type/:yearLabel', (req, res) => {
  const type = req.params.type;
  const yearLabel = req.params.yearLabel;
  const db = readDB();
  db.yearSections = db.yearSections || { anime: [], manga: [] };
  if (db.yearSections[type]) {
    db.yearSections[type] = db.yearSections[type].filter(y => String(y) !== String(yearLabel));
  }
  // remove items assigned to that yearSection
  if (type === 'anime') {
    db.anime = (db.anime || []).filter(a => String(a.yearSection || a.year || 'Ungrouped') !== String(yearLabel));
  } else {
    db.manga = (db.manga || []).filter(m => String(m.yearSection || m.year || 'Ungrouped') !== String(yearLabel));
  }
  writeDB(db);
  res.json({ ok: true });
});

// Anime list
app.get('/api/anime', (req, res) => {
  const db = readDB();
  res.json(db.anime || []);
});

// Add anime (no seasons)
app.post('/api/anime', async (req, res) => {
  try {
    const { title, episodes_watched = 0, total_episodes = null, year = null, yearSection = null } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const db = readDB();
    const fetched = await fetchPosterForAnime(title);

    // Attempt to download poster locally if available
    let posterLocal = null;
    if (fetched.poster) {
      const malId = fetched.mal_id || Date.now();
      const localPath = path.join(POSTERS_DIR, String(malId), 'poster.jpg');
      const saved = await downloadImageToPath(fetched.poster, localPath);
      posterLocal = saved || null;
    }

    const item = {
      id: Date.now().toString(),
      title: fetched.titleFetched || title,
      originalTitle: title,
      mal_id: fetched.mal_id || null,
      poster: posterLocal || fetched.poster || null,
      episodes_watched: Number(episodes_watched) || 0,
      total_episodes: total_episodes !== null ? Number(total_episodes) : null,
      finished: false,
      year: year || fetched.year || null,
      yearSection: yearSection || null,
      addedAt: new Date().toISOString()
    };

    db.anime = db.anime || [];
    db.anime.push(item);
    writeDB(db);
    res.json(item);
  } catch (e) {
    console.error('add anime failed', e);
    res.status(500).json({ error: 'failed to add anime', detail: String(e) });
  }
});

// Update anime (patch fields like episodes_watched, total_episodes, finished, year, yearSection)
app.patch('/api/anime/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.anime = db.anime || [];
  const idx = db.anime.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const item = db.anime[idx];
  if (req.body.hasOwnProperty('episodes_watched')) item.episodes_watched = Number(req.body.episodes_watched);
  if (req.body.hasOwnProperty('total_episodes')) item.total_episodes = req.body.total_episodes !== null ? Number(req.body.total_episodes) : null;
  if (req.body.hasOwnProperty('finished')) item.finished = !!req.body.finished;
  if (req.body.hasOwnProperty('title')) item.title = req.body.title;
  if (req.body.hasOwnProperty('year')) item.year = req.body.year;
  if (req.body.hasOwnProperty('yearSection')) item.yearSection = req.body.yearSection;
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

// Manga endpoints (unchanged except yearSection kept)
app.get('/api/manga', (req, res) => {
  const db = readDB();
  res.json(db.manga || []);
});
app.post('/api/manga', async (req, res) => {
  const { title, chapters_read = 0, year = null, yearSection = null } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const db = readDB();
  try {
    const j = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`);
    const jjson = await j.json();
    const found = (jjson && jjson.data && jjson.data[0]) ? jjson.data[0] : null;
    const coverUrl = (found && found.images && found.images.jpg && (found.images.jpg.large_image_url || found.images.jpg.image_url)) || null;
    let coverLocal = null;
    if (coverUrl) {
      const localPath = path.join(POSTERS_DIR, 'manga-' + Date.now(), 'cover.jpg');
      coverLocal = await downloadImageToPath(coverUrl, localPath);
    }
    const item = {
      id: Date.now().toString(),
      title: (found && found.title) || title,
      originalTitle: title,
      cover: coverLocal || coverUrl || null,
      chapters_read: Number(chapters_read) || 0,
      finished: false,
      year: year || null,
      yearSection: yearSection || null,
      addedAt: new Date().toISOString()
    };
    db.manga = db.manga || [];
    db.manga.push(item);
    writeDB(db);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: 'failed to add manga', detail: String(e) });
  }
});
app.patch('/api/manga/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  db.manga = db.manga || [];
  const idx = db.manga.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const item = db.manga[idx];
  if (req.body.hasOwnProperty('chapters_read')) item.chapters_read = Number(req.body.chapters_read);
  if (req.body.hasOwnProperty('finished')) item.finished = !!req.body.finished;
  if (req.body.hasOwnProperty('year')) item.year = req.body.year;
  if (req.body.hasOwnProperty('yearSection')) item.yearSection = req.body.yearSection;
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

// Top lists
app.get('/api/top/anime', (req, res) => {
  const db = readDB();
  res.json(db.topAnime || []);
});
app.post('/api/top/anime', (req, res) => {
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

// Poster search helper endpoints
app.get('/api/search/anime', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ results: [] });
  try {
    const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=6`);
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
    const r = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=6`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.json({ results: [] });
  }
});

// fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
