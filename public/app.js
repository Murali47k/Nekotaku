// public/app.js
const api = {
  getAnime: () => fetch('/api/anime').then(r => r.json()),
  addAnime: (payload) => fetch('/api/anime', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  patchAnime: (id, patch) => fetch('/api/anime/' + id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(patch)}).then(r => r.json()),
  deleteAnime: (id) => fetch('/api/anime/' + id, { method: 'DELETE'}).then(r => r.json()),

  getManga: () => fetch('/api/manga').then(r => r.json()),
  addManga: (payload) => fetch('/api/manga', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  patchManga: (id, patch) => fetch('/api/manga/' + id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(patch)}).then(r => r.json()),
  deleteManga: (id) => fetch('/api/manga/' + id, { method: 'DELETE'}).then(r => r.json()),

  getHome: () => fetch('/api/home').then(r => r.json()),
  addHomeNote: (text) => fetch('/api/home', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text })}).then(r=>r.json()),

  getTopAnime: () => fetch('/api/top/anime').then(r=>r.json()),
  setTopAnime: (list) => fetch('/api/top/anime', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ list })}).then(r => r.json()),
  getTopManga: () => fetch('/api/top/manga').then(r=>r.json()),
  setTopManga: (list) => fetch('/api/top/manga', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ list })}).then(r => r.json()),

  getYears: (type) => fetch(`/api/years/${type}`).then(r => r.json()),
  addYear: (type, yearLabel) => fetch(`/api/years/${type}`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ yearLabel })}).then(r => r.json()),
  deleteYear: (type, yearLabel) => fetch(`/api/years/${type}/${encodeURIComponent(yearLabel)}`, { method: 'DELETE' }).then(r => r.json()),

  searchAnime: (q) => fetch('/api/search/anime?q=' + encodeURIComponent(q)).then(r=>r.json()),
  searchManga: (q) => fetch('/api/search/manga?q=' + encodeURIComponent(q)).then(r=>r.json())
};

/* ---------- HOME ---------- */
async function initHome() {
  const res = await api.getHome();
  const notes = res.notes || [];
  const container = document.getElementById('home-notes');
  if (container) {
    container.innerHTML = '';
    notes.forEach(n => {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '10px';
      div.textContent = n.text;
      container.appendChild(div);
    });
  }

  // load Top 10 lists
  const animeRoot = document.getElementById('top-anime-root');
  const mangaRoot = document.getElementById('top-manga-root');
  if (animeRoot && mangaRoot) {
    const topsA = await api.getTopAnime();
    const topsM = await api.getTopManga();
    animeRoot.innerHTML = '';
    mangaRoot.innerHTML = '';

    (topsA || []).forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'top-item';
      const img = document.createElement('img');
      img.src = it.poster || '/placeholders/no.png';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const h = document.createElement('div'); h.style.fontWeight = 700; h.textContent = `${idx+1}. ${it.title}`;
      const p = document.createElement('div'); p.className = 'small'; p.textContent = it.reason || '';
      meta.appendChild(h); meta.appendChild(p);
      div.appendChild(img); div.appendChild(meta);
      animeRoot.appendChild(div);
    });
    

    (topsM || []).forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'top-item';
      const img = document.createElement('img');
      img.src = it.poster || '/placeholders/no.png';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const h = document.createElement('div'); h.style.fontWeight = 700; h.textContent = `${idx+1}. ${it.title}`;
      const p = document.createElement('div'); p.className = 'small'; p.textContent = it.reason || '';
      meta.appendChild(h); meta.appendChild(p);
      div.appendChild(img); div.appendChild(meta);
      mangaRoot.appendChild(div);
    });
  }
}

async function promptAddHomeNote() {
  const text = prompt('Write a short "about me" paragraph:');
  if (text && text.trim()) {
    await api.addHomeNote(text.trim());
    await initHome();
  }
}

/* ---------- TOP lists editing ---------- */
async function promptEditTop(type='anime') {
  const current = (type === 'anime') ? await api.getTopAnime() : await api.getTopManga();
  const newList = [];
  for (let i = 0; i < 10; i++) {
    const cur = current[i] ? current[i].title : '';
    const title = prompt(`Top ${type} #${i+1} title (leave blank to skip):`, cur || '');
    if (!title) continue;
    const reason = prompt(`Why you like "${title}"? (short):`, (current[i] && current[i].reason) || '');
    // attempt quick poster via search
    let poster = null;
    try {
      const s = await api.searchAnime(title);
      if (s && s.data && s.data.length > 0) poster = (s.data[0].images && s.data[0].images.jpg && (s.data[0].images.jpg.large_image_url || s.data[0].images.jpg.image_url)) || null;
    } catch (e) {}
    newList.push({ title, reason, poster });
  }
  if (type === 'anime') await api.setTopAnime(newList);
  else await api.setTopManga(newList);
  initHome();
}

/* ---------- YEAR sections (user-created) ---------- */
async function promptAddYear(type) {
  const label = prompt('Enter a label for this year section (e.g. 2025):');
  if (!label) return;
  await api.addYear(type, label);
  if (type === 'anime') initAnimePage();
  else initMangaPage();
}
async function promptDeleteYear(type, label) {
  if (!confirm(`Delete section "${label}" and all items inside it?`)) return;
  await api.deleteYear(type, label);
  if (type === 'anime') initAnimePage();
  else initMangaPage();
}

/* ---------- ANIME page (no seasons) ---------- */
async function initAnimePage() {
  const container = document.getElementById('year-sections');
  if (!container) return;
  container.innerHTML = '';

  const years = await api.getYears('anime'); // user-defined sections
  const list = await api.getAnime();

  // ensure unique year labels (defensive; server already ensures unique)
  const sections = Array.isArray(years) && years.length ? [...new Set(years)] : ['Ungrouped'];

  for (const yearLabel of sections) {
    const sec = document.createElement('div');
    sec.className = 'year-section card';
    const head = document.createElement('div');
    head.className = 'year-head';
    const h = document.createElement('h3'); h.textContent = yearLabel;

    const actionWrap = document.createElement('div');
    // Add anime button and Delete year button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = `Add anime to ${yearLabel}`;
    addBtn.onclick = () => promptAddAnime(yearLabel);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = 'Remove Year';
    delBtn.onclick = () => promptDeleteYear('anime', yearLabel);

    actionWrap.appendChild(addBtn);
    actionWrap.appendChild(delBtn);

    head.appendChild(h);
    head.appendChild(actionWrap);
    sec.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'year-gallery';

    const items = list.filter(a => (a.yearSection || (a.year ? String(a.year) : null) || 'Ungrouped') === yearLabel);

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';

      const poster = item.poster || '/placeholders/no.png';
      const posterHtml = `<div class="card-poster"><img src="${poster}" alt="${escapeHtml(item.title)}"></div>`;

      // episodes and toggles
      const epsWatched = item.episodes_watched || 0;
      const epsTotal = item.total_episodes !== null ? item.total_episodes : 'Unknown';

      card.innerHTML = `
        ${posterHtml}
        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="small">Episodes: <span id="ep_${item.id}">${epsWatched}</span> / ${epsTotal}</div>
          <div style="margin-top:8px;" class="controls">
            <button class="btn" onclick="pages.editEpisodes('${item.id}', ${epsWatched}, ${item.total_episodes !== null ? item.total_episodes : 'null'})">Update episodes</button>
            <button class="btn ghost" onclick="pages.toggleFinished('${item.id}')">${item.finished ? 'Mark as watching' : 'Mark finished'}</button>
            <button class="btn ghost" onclick="pages.deleteAnimeConfirm('${item.id}')">Delete</button>
          </div>
        </div>
      `;
      gallery.appendChild(card);
    });

    sec.appendChild(gallery);
    container.appendChild(sec);
  }
}

async function promptAddAnime(targetYearSection = null) {
  const title = prompt('Anime title (not season title):');
  if (!title) return;
  const eps = prompt('Episodes watched (optional):', '0');
  const total = prompt('Total episodes (optional):', '');
  const year = prompt('What year did you watch it? (label, e.g. 2025) — leave blank for Ungrouped:', targetYearSection || '');
  const payload = {
    title,
    episodes_watched: Number(eps) || 0,
    total_episodes: total ? Number(total) : null,
    year: year || null,
    yearSection: year || targetYearSection || null
  };
  await api.addAnime(payload);
  initAnimePage();
}

async function editEpisodes(id, current, total) {
  const v = prompt('Enter episodes watched (number):', current || 0);
  const n = Number(v);
  if (isNaN(n)) return alert('Invalid number');
  await api.patchAnime(id, { episodes_watched: n, finished: (total !== null && n >= total) });
  // update count in DOM quickly
  const span = document.getElementById(`ep_${id}`);
  if (span) span.textContent = n;
  initAnimePage();
}

async function toggleFinished(id) {
  const list = await api.getAnime();
  const item = list.find(a => a.id === id);
  if (!item) return;
  await api.patchAnime(id, { finished: !item.finished });
  initAnimePage();
}

async function deleteAnimeConfirm(id) {
  if (!confirm('Delete this anime from your list?')) return;
  await api.deleteAnime(id);
  initAnimePage();
}

/* ---------- MANGA page ---------- */
async function initMangaPage() {
  const container = document.getElementById('manga-year-sections');
  if (!container) return;
  container.innerHTML = '';

  const years = await api.getYears('manga');
  const list = await api.getManga();
  const sections = Array.isArray(years) && years.length ? [...new Set(years)] : ['Ungrouped'];

  for (const yearLabel of sections) {
    const sec = document.createElement('div');
    sec.className = 'year-section card';
    const head = document.createElement('div');
    head.className = 'year-head';
    const h = document.createElement('h3'); h.textContent = yearLabel;

    const actionWrap = document.createElement('div');
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = `Add manga to ${yearLabel}`;
    addBtn.onclick = () => promptAddManga(yearLabel);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = 'Remove Year';
    delBtn.onclick = () => promptDeleteYear('manga', yearLabel);
    actionWrap.appendChild(addBtn);
    actionWrap.appendChild(delBtn);

    head.appendChild(h);
    head.appendChild(actionWrap);
    sec.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'year-gallery';

    const items = list.filter(m => (m.yearSection || (m.year ? String(m.year) : null) || 'Ungrouped') === yearLabel);

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const poster = item.cover || '/placeholders/no.png';
      card.innerHTML = `
        <div class="card-poster"><img src="${poster}" alt="${escapeHtml(item.title)}"></div>
        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="small">Chapters read: ${item.chapters_read || 0}</div>
          <div style="margin-top:8px;" class="controls">
            <button class="btn" onclick="pages.promptUpdateManga('${item.id}','${item.chapters_read || 0}')">Update chapters</button>
            <button class="btn ghost" onclick="pages.toggleMangaFinished('${item.id}')">${item.finished ? 'Mark reading' : 'Mark finished'}</button>
            <button class="btn ghost" onclick="pages.deleteMangaConfirm('${item.id}')">Delete</button>
          </div>
        </div>
      `;
      gallery.appendChild(card);
    });

    sec.appendChild(gallery);
    container.appendChild(sec);
  }
}

async function promptAddManga(targetYearSection = null) {
  const title = prompt('Manga title:');
  if (!title) return;
  const chapters = prompt('Chapters read (optional):', '0');
  const year = prompt('What year did you read it? (label, e.g. 2025) — leave blank for Ungrouped:', targetYearSection || '');
  const item = await api.addManga({ title, chapters_read: Number(chapters) || 0, year: year || null, yearSection: year || targetYearSection || null });
  initMangaPage();
}

async function promptUpdateManga(id, current) {
  const v = prompt('Enter chapters read (number):', current || 0);
  const n = Number(v);
  if (isNaN(n)) return alert('Invalid number');
  await api.patchManga(id, { chapters_read: n });
  initMangaPage();
}
async function toggleMangaFinished(id) {
  const list = await api.getManga();
  const m = list.find(x => x.id === id);
  if (!m) return;
  await api.patchManga(id, { finished: !m.finished });
  initMangaPage();
}
async function deleteMangaConfirm(id) {
  if (!confirm('Delete this manga from your list?')) return;
  await api.deleteManga(id);
  initMangaPage();
}

/* ---------- Utilities & exports ---------- */
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

window.pages = {
  initHome,
  promptAddHomeNote,
  promptEditTop,
  initAnimePage,
  promptAddAnime,
  editEpisodes,
  toggleFinished,
  deleteAnimeConfirm,
  initMangaPage,
  promptAddManga,
  promptUpdateManga,
  toggleMangaFinished,
  deleteMangaConfirm,
  promptAddYear,
  promptDeleteYear
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('home-notes')) pages.initHome();
  if (document.getElementById('year-sections')) pages.initAnimePage();
  if (document.getElementById('manga-year-sections')) pages.initMangaPage();
});
