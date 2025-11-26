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

// Middleware
app.use(morgan('tiny'));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(cors());

// IMPORTANT: Disable auto serving of index.html
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Ensure poster folder exists
if (!fs.existsSync(POSTERS_DIR)) fs.mkdirSync(POSTERS_DIR, { recursive: true });

// --- JSON DB Helpers ---
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {
      anime: [],
      manga: [],
      topAnime: [],
      topManga: [],
      homeNotes: [],
      yearSections: { anime: [], manga: [] }
    };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Create DB if not present
if (!fs.existsSync(DB_FILE)) {
  writeDB({
    anime: [],
    manga: [],
    topAnime: [],
    topManga: [],
    homeNotes: [
      {
        id: 1,
        text: "Add your 'about me' paragraphs from the Home page UI by clicking the 'Add note' button."
      }
    ],
    yearSections: { anime: [], manga: [] }
  });
}

// --- IMAGE HELPERS ---
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
    console.warn("download failed", e);
    return null;
  }
}

function deletePosterFile(posterPath) {
  if (!posterPath) return;
  try {
    const fullPath = path.join(__dirname, 'public', posterPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      const dir = path.dirname(fullPath);
      try {
        if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch {}
    }
  } catch (e) {
    console.warn("delete poster failed", e);
  }
}

// --- JIKAN HELPERS ---
async function fetchPosterForAnime(title) {
  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    const json = await res.json();
    if (json?.data?.length > 0) {
      const item = json.data[0];
      const img =
        item.images?.jpg?.large_image_url ||
        item.images?.jpg?.image_url ||
        null;
      const year =
        item.year ||
        (item.aired?.from ? new Date(item.aired.from).getFullYear() : null);

      return {
        poster: img,
        titleFetched: item.title || title,
        year,
        mal_id: item.mal_id || null
      };
    }
  } catch (e) {
    console.warn("Jikan anime fetch failed", e);
  }
  return { poster: null, titleFetched: title, year: null, mal_id: null };
}

async function fetchPosterForManga(title) {
  try {
    const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    const json = await res.json();
    if (json?.data?.length > 0) {
      const item = json.data[0];
      const img =
        item.images?.jpg?.large_image_url ||
        item.images?.jpg?.image_url ||
        null;

      return {
        poster: img,
        titleFetched: item.title || title,
        mal_id: item.mal_id || null
      };
    }
  } catch (e) {
    console.warn("Jikan manga fetch failed", e);
  }
  return { poster: null, titleFetched: title, mal_id: null };
}

// --- API ROUTES ---

app.get('/api/db', (req, res) => {
  res.json(readDB());
});

// HOME
app.get('/api/home', (req, res) => {
  const db = readDB();
  res.json({ notes: db.homeNotes, topAnime: db.topAnime, topManga: db.topManga });
});

app.post('/api/home', (req, res) => {
  const { text } = req.body;
  const db = readDB();
  db.homeNotes.push({ id: Date.now(), text });
  writeDB(db);
  res.json(db.homeNotes);
});

// YEAR SECTIONS
app.get('/api/years/:type', (req, res) => {
  const db = readDB();
  res.json(db.yearSections[req.params.type] || []);
});

app.post('/api/years/:type', (req, res) => {
  const type = req.params.type;
  const { yearLabel } = req.body;
  if (!yearLabel) return res.status(400).json({ error: "yearLabel required" });

  const db = readDB();
  if (!db.yearSections[type].includes(yearLabel)) {
    db.yearSections[type].push(yearLabel);
  }

  writeDB(db);
  res.json(db.yearSections[type]);
});

app.delete('/api/years/:type/:yearLabel', (req, res) => {
  const type = req.params.type;
  const yearLabel = req.params.yearLabel;
  const db = readDB();

  db.yearSections[type] = db.yearSections[type].filter(
    y => String(y) !== String(yearLabel)
  );

  if (type === "anime") {
    const toDelete = db.anime.filter(a =>
      String(a.yearSection || a.year || "Ungrouped") === String(yearLabel)
    );
    toDelete.forEach(a => deletePosterFile(a.poster));
    db.anime = db.anime.filter(
      a => String(a.yearSection || a.year || "Ungrouped") !== String(yearLabel)
    );
  } else {
    const toDelete = db.manga.filter(m =>
      String(m.yearSection || m.year || "Ungrouped") === String(yearLabel)
    );
    toDelete.forEach(m => deletePosterFile(m.cover));
    db.manga = db.manga.filter(
      m => String(m.yearSection || m.year || "Ungrouped") !== String(yearLabel)
    );
  }

  writeDB(db);
  res.json({ ok: true });
});

// ANIME ROUTES
app.get('/api/anime', (req, res) => {
  res.json(readDB().anime);
});

app.post('/api/anime', async (req, res) => {
  try {
    const { title, episodes_watched = 0, total_episodes = null, year = null, yearSection = null } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const db = readDB();
    const fetched = await fetchPosterForAnime(title);

    let posterLocal = null;
    if (fetched.poster) {
      const malId = fetched.mal_id || Date.now();
      const localPath = path.join(POSTERS_DIR, 'anime', `${malId}.jpg`);
      posterLocal = await downloadImageToPath(fetched.poster, localPath);
    }

    const item = {
      id: Date.now().toString(),
      title: fetched.titleFetched,
      originalTitle: title,
      mal_id: fetched.mal_id,
      poster: posterLocal || fetched.poster,
      episodes_watched: Number(episodes_watched),
      total_episodes: total_episodes !== null ? Number(total_episodes) : null,
      finished: false,
      year: year || fetched.year,
      yearSection,
      addedAt: new Date().toISOString()
    };

    db.anime.push(item);
    writeDB(db);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: "failed to add anime", detail: String(e) });
  }
});

app.patch('/api/anime/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const idx = db.anime.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const item = db.anime[idx];
  Object.assign(item, req.body);

  writeDB(db);
  res.json(item);
});

app.delete('/api/anime/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const item = db.anime.find(a => a.id === id);
  if (item) deletePosterFile(item.poster);
  db.anime = db.anime.filter(a => a.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// MANGA ROUTES
app.get('/api/manga', (req, res) => {
  res.json(readDB().manga);
});

app.post('/api/manga', async (req, res) => {
  const { title, chapters_read = 0, year = null, yearSection = null } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });

  const db = readDB();
  try {
    const fetched = await fetchPosterForManga(title);

    let coverLocal = null;
    if (fetched.poster) {
      const malId = fetched.mal_id || Date.now();
      const localPath = path.join(POSTERS_DIR, 'manga', `${malId}.jpg`);
      coverLocal = await downloadImageToPath(fetched.poster, localPath);
    }

    const item = {
      id: Date.now().toString(),
      title: fetched.titleFetched,
      originalTitle: title,
      cover: coverLocal || fetched.poster,
      chapters_read: Number(chapters_read),
      finished: false,
      year,
      yearSection,
      addedAt: new Date().toISOString()
    };

    db.manga.push(item);
    writeDB(db);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: "failed to add manga", detail: String(e) });
  }
});

app.patch('/api/manga/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const idx = db.manga.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const item = db.manga[idx];
  Object.assign(item, req.body);

  writeDB(db);
  res.json(item);
});

app.delete('/api/manga/:id', (req, res) => {
  const id = req.params.id;
  const db = readDB();
  const item = db.manga.find(m => m.id === id);
  if (item) deletePosterFile(item.cover);
  db.manga = db.manga.filter(m => m.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// TOP LISTS
app.get('/api/top/anime', (req, res) => {
  res.json(readDB().topAnime);
});

app.post('/api/top/anime', (req, res) => {
  const db = readDB();
  db.topAnime = Array.isArray(req.body.list) ? req.body.list.slice(0, 10) : [];
  writeDB(db);
  res.json(db.topAnime);
});

app.get('/api/top/manga', (req, res) => {
  res.json(readDB().topManga);
});

app.post('/api/top/manga', (req, res) => {
  const db = readDB();
  db.topManga = Array.isArray(req.body.list) ? req.body.list.slice(0, 10) : [];
  writeDB(db);
  res.json(db.topManga);
});

// SEARCH
app.get('/api/search/anime', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ results: [] });

  try {
    const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=6`);
    res.json(await r.json());
  } catch {
    res.json({ results: [] });
  }
});

app.get('/api/search/manga', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ results: [] });

  try {
    const r = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=6`);
    res.json(await r.json());
  } catch {
    res.json({ results: [] });
  }
});

// ---- LOGIN AS DEFAULT PAGE ----

// Serve login.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Fallback for all routes → login.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
