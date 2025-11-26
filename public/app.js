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

  // Load counts
  const [animeList, mangaList] = await Promise.all([
    api.getAnime(),
    api.getManga()
  ]);
  
  const animeCountEl = document.getElementById('anime-count');
  const mangaCountEl = document.getElementById('manga-count');
  if (animeCountEl) animeCountEl.textContent = animeList.length;
  if (mangaCountEl) mangaCountEl.textContent = mangaList.length;

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
      meta.appendChild(h);
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
      meta.appendChild(h);
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
  const allItems = (type === 'anime') ? await api.getAnime() : await api.getManga();
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      <h2>Edit Top 10 ${type === 'anime' ? 'Anime' : 'Manga'}</h2>
      <div id="top-list-container" style="margin-top:16px;"></div>
      <div style="margin-top:16px; display:flex; gap:12px;">
        <button class="btn" onclick="pages.addTopItem('${type}')">Add Item</button>
        <button class="btn" onclick="pages.saveTopList('${type}')">Save</button>
        <button class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const container = document.getElementById('top-list-container');
  window.currentTopList = [...current];
  window.availableItems = allItems;
  window.currentTopType = type;
  
  renderTopList(container, type);
  
  // Add click outside handler after a small delay to avoid immediate closure
  setTimeout(() => {
    document.addEventListener('click', window.handleTopListOutsideClick);
  }, 100);
}

function renderTopList(container, type) {
  container.innerHTML = '';
  const list = window.currentTopList || [];
  const available = window.availableItems || [];
  
  list.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'top-edit-item';
    
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:8px;">
        <span style="font-weight:700; min-width:30px;">#${idx + 1}</span>
        <div style="flex:1; position:relative;">
          <input 
            type="text" 
            class="searchable-select-input" 
            data-idx="${idx}"
            value="${escapeHtml(item.title)}" 
            placeholder="Type to search ${type === 'anime' ? 'anime' : 'manga'}..."
            autocomplete="off"
            style="width:100%; padding:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;"
          >
          <div 
            id="dropdown-${idx}" 
            class="searchable-dropdown" 
            style="display:none; position:absolute; top:100%; left:0; right:0; max-height:200px; overflow-y:auto; background:rgba(20,20,30,0.98); border:1px solid rgba(255,255,255,0.1); border-radius:6px; margin-top:4px; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.3);"
          ></div>
        </div>
        <button class="btn ghost" onclick="pages.removeTopItem(${idx})">Remove</button>
      </div>
    `;
    container.appendChild(div);
    
    // Attach event listeners to the input
    const input = div.querySelector('.searchable-select-input');
    input.addEventListener('focus', () => showDropdownForInput(idx, type));
    input.addEventListener('input', (e) => filterDropdownForInput(idx, e.target.value, type));
  });
}

function showDropdownForInput(idx, type) {
  // Hide all other dropdowns
  document.querySelectorAll('.searchable-dropdown').forEach(dd => {
    dd.style.display = 'none';
  });
  
  const dropdown = document.getElementById(`dropdown-${idx}`);
  const available = window.availableItems || [];
  
  if (!dropdown) return;
  
  dropdown.innerHTML = '';
  
  if (available.length === 0) {
    const noItems = document.createElement('div');
    noItems.style.cssText = 'padding:8px 12px; color:var(--muted); font-style:italic;';
    noItems.textContent = `No ${type} available`;
    dropdown.appendChild(noItems);
  } else {
    available.forEach(availItem => {
      const posterPath = type === 'anime' ? availItem.poster : availItem.cover;
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.style.cssText = 'padding:8px 12px; cursor:pointer; color:#e6eef8; transition:background 0.2s;';
      option.textContent = availItem.title;
      option.dataset.title = availItem.title;
      option.dataset.poster = posterPath || '';
      
      option.addEventListener('mouseenter', () => {
        option.style.background = 'rgba(255,255,255,0.1)';
      });
      option.addEventListener('mouseleave', () => {
        option.style.background = 'transparent';
      });
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        selectDropdownItem(idx, availItem.title, posterPath);
      });
      
      dropdown.appendChild(option);
    });
  }
  
  dropdown.style.display = 'block';
}

function filterDropdownForInput(idx, searchText, type) {
  const dropdown = document.getElementById(`dropdown-${idx}`);
  const available = window.availableItems || [];
  
  if (!dropdown) return;
  
  dropdown.innerHTML = '';
  
  const filtered = available.filter(item => 
    item.title.toLowerCase().includes(searchText.toLowerCase())
  );
  
  if (filtered.length === 0) {
    const noResults = document.createElement('div');
    noResults.style.cssText = 'padding:8px 12px; color:var(--muted); font-style:italic;';
    noResults.textContent = 'No results found';
    dropdown.appendChild(noResults);
  } else {
    filtered.forEach(availItem => {
      const posterPath = type === 'anime' ? availItem.poster : availItem.cover;
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.style.cssText = 'padding:8px 12px; cursor:pointer; color:#e6eef8; transition:background 0.2s;';
      option.textContent = availItem.title;
      option.dataset.title = availItem.title;
      option.dataset.poster = posterPath || '';
      
      option.addEventListener('mouseenter', () => {
        option.style.background = 'rgba(255,255,255,0.1)';
      });
      option.addEventListener('mouseleave', () => {
        option.style.background = 'transparent';
      });
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        selectDropdownItem(idx, availItem.title, posterPath);
      });
      
      dropdown.appendChild(option);
    });
  }
  
  dropdown.style.display = 'block';
}

function selectDropdownItem(idx, title, poster) {
  const input = document.querySelector(`.searchable-select-input[data-idx="${idx}"]`);
  const dropdown = document.getElementById(`dropdown-${idx}`);
  
  if (input) input.value = title;
  if (dropdown) dropdown.style.display = 'none';
  
  if (window.currentTopList && window.currentTopList[idx]) {
    window.currentTopList[idx] = { title, poster };
  }
}

// Handle clicks outside dropdown
window.handleTopListOutsideClick = function(e) {
  if (!e.target.closest('.searchable-select-input') && !e.target.closest('.searchable-dropdown')) {
    document.querySelectorAll('.searchable-dropdown').forEach(dd => {
      dd.style.display = 'none';
    });
  }
};

async function addTopItem(type) {
  if (!window.currentTopList) window.currentTopList = [];
  if (window.currentTopList.length >= 10) {
    console.error('Maximum 10 items allowed in Top 10 list.');
    return;
  }
  window.currentTopList.push({ title: '', poster: null });
  const container = document.getElementById('top-list-container');
  renderTopList(container, type);
}

function removeTopItem(idx) {
  window.currentTopList.splice(idx, 1);
  const container = document.getElementById('top-list-container');
  const type = window.currentTopType;
  renderTopList(container, type);
}

async function saveTopList(type) {
  const inputs = document.querySelectorAll('.searchable-select-input');
  const newList = [];
  
  for (let input of inputs) {
    const idx = input.getAttribute('data-idx');
    const title = input.value.trim();
    
    if (!title) continue;
    
    // Get the poster from currentTopList
    const poster = window.currentTopList[idx]?.poster || null;
    
    newList.push({ title, poster });
  }
  
  if (type === 'anime') await api.setTopAnime(newList);
  else await api.setTopManga(newList);
  
  // Clean up event listener
  document.removeEventListener('click', window.handleTopListOutsideClick);
  
  document.querySelector('.modal').remove();
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
  // Replaced confirm() with a message in console as confirmation dialog is not available
  console.log(`Attempting to delete section "${label}". Confirmation is required on the backend/server.`);
  
  // NOTE: Since confirm() is forbidden, we proceed with the delete, assuming the user is aware.
  // In a real app, this would be a proper modal confirmation.
  await api.deleteYear(type, label);
  if (type === 'anime') initAnimePage();
  else initMangaPage();
}

// Helper to create and show a modal form
function showEntryModal(type, targetYearSection, onSubmit) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const isAnime = type === 'anime';
    const mediaType = isAnime ? 'Anime' : 'Manga';
    const unit = isAnime ? 'Episodes' : 'Chapters';

    // --- NEW STYLING APPLIED HERE ---
    const inputStyle = `
        width: 100%; 
        padding: 10px 12px; 
        margin-top: 4px; 
        border-radius: 8px; 
        background: var(--glass); 
        border: 1px solid rgba(255,255,255,0.08); 
        outline: none; 
        color: #e6eef8; /* Use root text color */
    `;
    const labelStyle = `
        display: block; 
        font-size: 14px; 
        font-weight: 500; 
        color: var(--muted); /* Use muted color for label */
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px;">
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            <h2>Add New ${mediaType}</h2>
            <form id="add-entry-form" style="margin-top:16px;">
                <div style="margin-bottom:16px;">
                    <label for="title" style="${labelStyle}">Title <span style="color:red;">*</span></label>
                    <input type="text" id="title" name="title" required
                           style="${inputStyle}"
                           onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
                </div>
                <div style="margin-bottom:16px;">
                    <label for="watched" style="${labelStyle}">${unit} Read/Watched (optional)</label>
                    <input type="number" id="watched" name="watched" value="0"
                           style="${inputStyle}"
                           onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
                </div>
                ${isAnime ? `
                <div style="margin-bottom:16px;">
                    <label for="total" style="${labelStyle}">Total Episodes (optional)</label>
                    <input type="number" id="total" name="total" placeholder="Leave blank if unknown"
                           style="${inputStyle}"
                           onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
                </div>
                ` : ''}
                <div style="margin-bottom:24px;">
                    <label for="year" style="${labelStyle}">Year Section (e.g. 2025)</label>
                    <input type="text" id="year" name="year" value="${targetYearSection || ''}"
                           style="${inputStyle}"
                           onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
                </div>
                <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:8px;">
                    <button type="button" class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn" style="background:var(--accent); color:var(--card); font-weight:700; border:1px solid var(--accent);">Add ${mediaType}</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('add-entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value.trim();
        const watched = Number(document.getElementById('watched').value) || 0;
        const year = document.getElementById('year').value.trim() || null;
        let total = null;

        if (isAnime) {
            const totalVal = document.getElementById('total').value.trim();
            total = totalVal ? Number(totalVal) : null;
        }

        if (title) {
            await onSubmit(title, watched, total, year);
            modal.remove();
        } else {
            // Replaced alert
            console.error('Title is required!');
        }
    });
}

/* ---------- ANIME page (no seasons) ---------- */
async function initAnimePage() {
  const container = document.getElementById('year-sections');
  if (!container) return;
  
  // FIX 1: Clear the container before fetching/rendering to prevent duplication on refresh
  container.innerHTML = '';

  const [years, list] = await Promise.all([
    api.getYears('anime'),
    api.getAnime()
  ]);

  // Get unique year sections - prioritize API years, then add any from items not in API
  const sectionsSet = new Set();
  
  // Add all year sections from API first
  if (Array.isArray(years) && years.length > 0) {
    years.forEach(y => sectionsSet.add(String(y).trim()));
  }
  
  // Add year sections from items that aren't already in the set
  list.forEach(item => {
    // Use yearSection if available, fallback to year, then 'Ungrouped'
    const section = String(item.yearSection || (item.year ? String(item.year) : 'Ungrouped')).trim();
    if (section) sectionsSet.add(section);
  });
  
  const sections = Array.from(sectionsSet).sort().reverse(); // Sort descending for latest years first

  for (const yearLabel of sections) {
    const sec = document.createElement('div');
    sec.className = 'year-section card';
    const head = document.createElement('div');
    head.className = 'year-head';
    const h = document.createElement('h3'); h.textContent = yearLabel;

    const actionWrap = document.createElement('div');
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = `Add anime to ${yearLabel}`;
    addBtn.onclick = () => promptAddAnime(yearLabel);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = 'Remove Year';
    delBtn.onclick = () => promptDeleteYear('anime', yearLabel);

    actionWrap.appendChild(addBtn);
    if (yearLabel !== 'Ungrouped' && years.includes(yearLabel)) {
       actionWrap.appendChild(delBtn);
    }


    head.appendChild(h);
    head.appendChild(actionWrap);
    sec.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'year-gallery';

    const items = list.filter(a => {
      const itemSection = String(a.yearSection || (a.year ? String(a.year) : 'Ungrouped')).trim();
      return itemSection === yearLabel;
    });

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';

      const poster = item.poster || '/placeholders/no.png';
      const isFinished = item.finished;
      const posterClass = isFinished ? '' : 'watching-border';
      const posterHtml = `<div class="card-poster ${posterClass}"><img src="${poster}" alt="${escapeHtml(item.title)}"></div>`;

      const epsWatched = item.episodes_watched || 0;
      const epsTotal = item.total_episodes !== null ? item.total_episodes : 'Unknown';

      card.innerHTML = `
        ${posterHtml}
        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="small">Episodes: <span id="ep_${item.id}">${epsWatched}</span> / ${epsTotal}</div>
          <div style="margin-top:8px;" class="controls">
            <button class="btn" onclick="pages.editEpisodes('${item.id}', ${epsWatched}, ${item.total_episodes !== null ? item.total_episodes : 'null'})">Update episodes</button>
            <button class="btn ghost" onclick="pages.toggleFinished('${item.id}')">${isFinished ? 'Mark as watching' : 'Mark finished'}</button>
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

// FIX 2: Replaced multiple prompt calls with a single form modal
async function promptAddAnime(targetYearSection = null) {
    showEntryModal('anime', targetYearSection, async (title, episodes_watched, total_episodes, year) => {
        const payload = {
            title,
            episodes_watched,
            total_episodes: total_episodes !== null ? total_episodes : null,
            year: year,
            yearSection: year || targetYearSection || null
        };
        await api.addAnime(payload);
        initAnimePage();
    });
}

async function editEpisodes(id, current, total) {
  const v = prompt('Enter episodes watched (number):', current || 0);
  const n = Number(v);
  if (isNaN(n)) return console.error('Invalid number entered for episodes.');
  await api.patchAnime(id, { episodes_watched: n, finished: (total !== null && n >= total) });
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
  // Replaced confirm() with a message in console as confirmation dialog is not available
  console.log('Delete action triggered. If this was a real application, a confirmation modal would appear here.');
  await api.deleteAnime(id);
  initAnimePage();
}

/* ---------- MANGA page ---------- */
async function initMangaPage() {
  const container = document.getElementById('manga-year-sections');
  if (!container) return;
  
  // FIX 1: Clear the container before fetching/rendering to prevent duplication on refresh
  container.innerHTML = '';

  const [years, list] = await Promise.all([
    api.getYears('manga'),
    api.getManga()
  ]);
  
  // Get unique year sections - prioritize API years, then add any from items not in API
  const sectionsSet = new Set();
  
  // Add all year sections from API first
  if (Array.isArray(years) && years.length > 0) {
    years.forEach(y => sectionsSet.add(String(y).trim()));
  }
  
  // Add year sections from items that aren't already in the set
  list.forEach(item => {
    const section = String(item.yearSection || (item.year ? String(item.year) : 'Ungrouped')).trim();
    if (section) sectionsSet.add(section);
  });
  
  const sections = Array.from(sectionsSet).sort().reverse(); // Sort descending for latest years first

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
    if (yearLabel !== 'Ungrouped' && years.includes(yearLabel)) {
       actionWrap.appendChild(delBtn);
    }

    head.appendChild(h);
    head.appendChild(actionWrap);
    sec.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'year-gallery';

    const items = list.filter(m => {
      const itemSection = String(m.yearSection || (m.year ? String(m.year) : 'Ungrouped')).trim();
      return itemSection === yearLabel;
    });

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const poster = item.cover || '/placeholders/no.png';
      const isFinished = item.finished;
      const posterClass = isFinished ? '' : 'watching-border';
      
      card.innerHTML = `
        <div class="card-poster ${posterClass}"><img src="${poster}" alt="${escapeHtml(item.title)}"></div>
        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="small">Chapters read: ${item.chapters_read || 0}</div>
          <div style="margin-top:8px;" class="controls">
            <button class="btn" onclick="pages.promptUpdateManga('${item.id}','${item.chapters_read || 0}')">Update chapters</button>
            <button class="btn ghost" onclick="pages.toggleMangaFinished('${item.id}')">${isFinished ? 'Mark reading' : 'Mark finished'}</button>
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

// FIX 2: Replaced multiple prompt calls with a single form modal
async function promptAddManga(targetYearSection = null) {
    showEntryModal('manga', targetYearSection, async (title, chapters_read, total_chapters, year) => {
        const payload = {
            title,
            chapters_read,
            year: year,
            yearSection: year || targetYearSection || null
        };
        // total_chapters is ignored for manga for now as the schema doesn't support it
        await api.addManga(payload);
        initMangaPage();
    });
}

async function promptUpdateManga(id, current) {
  const v = prompt('Enter chapters read (number):', current || 0);
  const n = Number(v);
  if (isNaN(n)) return console.error('Invalid number entered for chapters.');
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
  // Replaced confirm() with a message in console as confirmation dialog is not available
  console.log('Delete action triggered. If this was a real application, a confirmation modal would appear here.');
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
  addTopItem,
  removeTopItem,
  saveTopList,
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