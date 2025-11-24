// app.js - client side logic used in all pages
const api = {
  getAnime: () => fetch('/api/anime').then(r => r.json()),
  addAnime: (payload) => fetch('/api/anime', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  patchAnime: (id, patch) => fetch('/api/anime/' + id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(patch)}).then(r => r.json()),
  deleteAnime: (id) => fetch('/api/anime/' + id, { method: 'DELETE'}).then(r => r.json()),
  getManga: () => fetch('/api/manga').then(r => r.json()),
  addManga: (payload) => fetch('/api/manga', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  patchManga: (id, patch) => fetch('/api/manga/' + id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(patch)}).then(r => r.json()),
  deleteManga: (id) => fetch('/api/manga/' + id, { method: 'DELETE'}).then(r => r.json()),
  getTopAnime: () => fetch('/api/top/anime').then(r=>r.json()),
  setTopAnime: (list) => fetch('/api/top/anime', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ list })}).then(r => r.json()),
  getTopManga: () => fetch('/api/top/manga').then(r=>r.json()),
  setTopManga: (list) => fetch('/api/top/manga', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ list })}).then(r => r.json()),
  getHome: () => fetch('/api/home').then(r => r.json()),
  addHomeNote: (text) => fetch('/api/home', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text })}).then(r=>r.json()),
  searchAnime: (q) => fetch('/api/search/anime?q=' + encodeURIComponent(q)).then(r=>r.json()),
  searchManga: (q) => fetch('/api/search/manga?q=' + encodeURIComponent(q)).then(r=>r.json()),
};

// helper render for anime gallery
function groupByYear(items) {
  const map = {};
  items.forEach(it => {
    const y = it.year || 'Unknown';
    if (!map[y]) map[y] = [];
    map[y].push(it);
  });
  // sort years descending, putting Unknown last
  const years = Object.keys(map).sort((a,b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return (b - a);
  });
  return years.map(y => ({ year: y, items: map[y] }));
}

/* ---------- HOME page helpers ---------- */
async function initHome() {
  const container = document.getElementById('home-notes');
  const { notes } = await api.getHome();
  container.innerHTML = '';
  notes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '10px';
    div.textContent = n.text;
    container.appendChild(div);
  });
}

async function promptAddHomeNote() {
  const text = prompt('Write a short "about me" paragraph:');
  if (text && text.trim()) {
    await api.addHomeNote(text.trim());
    await initHome();
  }
}

/* ---------- ANIME page ---------- */
async function initAnimePage() {
  const container = document.getElementById('anime-root');
  const list = await api.getAnime();
  const grouped = groupByYear(list);
  container.innerHTML = '';
  grouped.forEach(g => {
    const section = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = g.year;
    h.style.margin = '12px 0 8px';
    section.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    g.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const posterWrap = document.createElement('div');
      posterWrap.className = 'card-poster';
      const img = document.createElement('img');
      img.src = item.poster || 'https://via.placeholder.com/300x420?text=No+Image';
      img.alt = item.title;
      posterWrap.appendChild(img);
      if (!item.finished) {
        const b = document.createElement('div');
        b.className = 'badge';
        b.textContent = 'Still watching';
        posterWrap.appendChild(b);
      }
      card.appendChild(posterWrap);

      const info = document.createElement('div');
      info.className = 'card-info';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.title;
      info.appendChild(title);

      const small = document.createElement('div');
      small.className = 'small';
      small.innerHTML = `Seasons: ${item.seasons || 1} • Episodes watched: ${item.episodes_watched || 0}` + (item.total_episodes ? ` / ${item.total_episodes}` : '');
      info.appendChild(small);

      const controls = document.createElement('div');
      controls.className = 'controls';
      const btnMark = document.createElement('button');
      btnMark.className = 'btn';
      btnMark.textContent = item.finished ? 'Mark as watching' : 'Mark finished';
      btnMark.onclick = async () => {
        await api.patchAnime(item.id, { finished: !item.finished });
        initAnimePage();
      };
      const btnUpdateEp = document.createElement('button');
      btnUpdateEp.className = 'btn ghost';
      btnUpdateEp.textContent = 'Update episodes';
      btnUpdateEp.onclick = async () => {
        const v = prompt('Enter episodes watched (number):', item.episodes_watched || 0);
        const n = Number(v);
        if (!isNaN(n)) {
          await api.patchAnime(item.id, { episodes_watched: n });
          initAnimePage();
        }
      };
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn ghost';
      btnDelete.textContent = 'Delete';
      btnDelete.onclick = async () => {
        if (confirm('Delete this anime from your list?')) {
          await api.deleteAnime(item.id);
          initAnimePage();
        }
      };
      controls.appendChild(btnMark);
      controls.appendChild(btnUpdateEp);
      controls.appendChild(btnDelete);

      info.appendChild(controls);
      card.appendChild(info);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    container.appendChild(section);
  });
}

async function promptAddAnime() {
  const title = prompt('Anime title (not season title):');
  if (!title) return;
  // optional seasons / episodes
  const seasons = Number(prompt('Number of seasons (optional, default 1):', '1')) || 1;
  const eps = prompt('Episodes watched (optional):', '0');
  const total = prompt('Total episodes (optional): leave blank if unknown','');
  const item = await api.addAnime({ title, seasons, episodes_watched: Number(eps) || 0, total_episodes: total ? Number(total) : null });
  alert('Added: ' + item.title);
  initAnimePage();
}

/* ---------- MANGA page ---------- */
async function initMangaPage() {
  const container = document.getElementById('manga-root');
  const list = await api.getManga();
  const grouped = groupByYear(list);
  container.innerHTML = '';
  grouped.forEach(g => {
    const section = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = g.year;
    h.style.margin = '12px 0 8px';
    section.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    g.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const posterWrap = document.createElement('div');
      posterWrap.className = 'card-poster';
      const img = document.createElement('img');
      img.src = item.cover || 'https://via.placeholder.com/300x420?text=No+Image';
      img.alt = item.title;
      posterWrap.appendChild(img);
      if (!item.finished) {
        const b = document.createElement('div');
        b.className = 'badge';
        b.textContent = 'Reading';
        posterWrap.appendChild(b);
      }
      card.appendChild(posterWrap);

      const info = document.createElement('div');
      info.className = 'card-info';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.title;
      info.appendChild(title);

      const small = document.createElement('div');
      small.className = 'small';
      small.innerHTML = `Chapters read: ${item.chapters_read || 0}` + (item.total_chapters ? ` / ${item.total_chapters}` : '');
      info.appendChild(small);

      const controls = document.createElement('div');
      controls.className = 'controls';
      const btnMark = document.createElement('button');
      btnMark.className = 'btn';
      btnMark.textContent = item.finished ? 'Mark reading' : 'Mark finished';
      btnMark.onclick = async () => {
        await api.patchManga(item.id, { finished: !item.finished });
        initMangaPage();
      };
      const btnUpdateCh = document.createElement('button');
      btnUpdateCh.className = 'btn ghost';
      btnUpdateCh.textContent = 'Update chapters';
      btnUpdateCh.onclick = async () => {
        const v = prompt('Enter chapters read (number):', item.chapters_read || 0);
        const n = Number(v);
        if (!isNaN(n)) {
          await api.patchManga(item.id, { chapters_read: n });
          initMangaPage();
        }
      };
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn ghost';
      btnDelete.textContent = 'Delete';
      btnDelete.onclick = async () => {
        if (confirm('Delete this manga from your list?')) {
          await api.deleteManga(item.id);
          initMangaPage();
        }
      };
      controls.appendChild(btnMark);
      controls.appendChild(btnUpdateCh);
      controls.appendChild(btnDelete);

      info.appendChild(controls);
      card.appendChild(info);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    container.appendChild(section);
  });
}

async function promptAddManga() {
  const title = prompt('Manga title:');
  if (!title) return;
  const chapters = prompt('Chapters read (optional):', '0');
  const total = prompt('Total chapters (optional):', '');
  const item = await api.addManga({ title, chapters_read: Number(chapters) || 0, total_chapters: total ? Number(total) : null });
  alert('Added: ' + item.title);
  initMangaPage();
}

/* ---------- Favourites page ---------- */
async function initFavs() {
  const animeRoot = document.getElementById('top-anime-root');
  const mangaRoot = document.getElementById('top-manga-root');
  const topA = await api.getTopAnime();
  const topM = await api.getTopManga();
  animeRoot.innerHTML = '';
  mangaRoot.innerHTML = '';

  topA.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'top-item';
    const img = document.createElement('img');
    img.src = it.poster || it.cover || 'https://via.placeholder.com/64x90?text=No';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const h = document.createElement('div');
    h.style.fontWeight = 700;
    h.textContent = `${idx+1}. ${it.title}`;
    const p = document.createElement('div');
    p.className = 'small';
    p.textContent = it.reason || '';
    meta.appendChild(h); meta.appendChild(p);
    div.appendChild(img); div.appendChild(meta);
    animeRoot.appendChild(div);
  });

  topM.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'top-item';
    const img = document.createElement('img');
    img.src = it.poster || it.cover || 'https://via.placeholder.com/64x90?text=No';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const h = document.createElement('div');
    h.style.fontWeight = 700;
    h.textContent = `${idx+1}. ${it.title}`;
    const p = document.createElement('div');
    p.className = 'small';
    p.textContent = it.reason || '';
    meta.appendChild(h); meta.appendChild(p);
    div.appendChild(img); div.appendChild(meta);
    mangaRoot.appendChild(div);
  });
}

async function promptEditTop(type='anime') {
  // Fetch current lists
  const current = type === 'anime' ? await api.getTopAnime() : await api.getTopManga();
  const newList = [];
  for (let i = 0; i < 10; i++) {
    const cur = current[i] ? current[i].title : '';
    const title = prompt(`Top ${type} #${i+1} title (leave blank to skip):`, cur || '');
    if (!title) continue;
    const reason = prompt(`Why you like "${title}"? (short):`, (current[i] && current[i].reason) || '');
    // try to get poster quickly
    let poster = null;
    try {
      const s = await fetch(`/api/search/${type}?q=${encodeURIComponent(title)}`);
      const j = await s.json();
      if (j && j.data && j.data.length > 0) {
        const d = j.data[0];
        poster = (d.images && d.images.jpg && d.images.jpg.large_image_url) || (d.images && d.images.jpg && d.images.jpg.image_url) || null;
      }
    } catch (e) { /* ignore */ }
    newList.push({ title, reason, poster });
  }
  if (type === 'anime') await api.setTopAnime(newList);
  else await api.setTopManga(newList);
  initFavs();
}

/* ---------- On pages load ---------- */
window.pages = {
  initHome,
  promptAddHomeNote,
  initAnimePage,
  promptAddAnime,
  initMangaPage,
  promptAddManga,
  initFavs,
  promptEditTop
};
