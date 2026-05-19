//public/app.js
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
  searchManga: (q) => fetch('/api/search/manga?q=' + encodeURIComponent(q)).then(r=>r.json()),

  /* ---------- BOOKS API ---------- */

  getBooks: () => fetch('/api/books').then(r => r.json()),
  addBook: (payload) => fetch('/api/books', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  }).then(r => r.json()),

  patchBook: (id, patch) => fetch('/api/books/' + id, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(patch)
  }).then(r => r.json()),

  deleteBook: (id) => fetch('/api/books/' + id, {
    method: 'DELETE'
  }).then(r => r.json()),

  /* ---------- Youtube API ---------- */

  getYoutube: () => fetch('/api/youtube').then(r => r.json()),

  addYoutube: (payload) => fetch('/api/youtube', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  }).then(r => r.json()),

  addYoutubeChannel: (payload) => fetch('/api/channels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(r => r.json()),

  getYoutubeChannels: () => fetch('/api/channels').then(r => r.json()),

  deleteYoutube: (id) => fetch('/api/youtube/' + id, {
    method: 'DELETE'
  }).then(r => r.json()),

  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
  },
};

/*Pokemon*/
const POKE_KEY = 'my_pokemon_team';

function getPokemonTeam() {
  return JSON.parse(localStorage.getItem(POKE_KEY) || '[]');
}

function savePokemonTeam(team) {
  localStorage.setItem(POKE_KEY, JSON.stringify(team));
}

function renderPokemonTeam() {
  const container = document.getElementById('pokemon-team');
  if (!container) return;

  const team = getPokemonTeam();
  container.innerHTML = '';

  team.forEach((poke, idx) => {
    const div = document.createElement('div');
    div.className = 'poke-card';

    const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${poke.id}.gif`;

    div.innerHTML = `
      <button class="remove-btn" onclick="pages.removePokemon(${idx})">x</button>
      <img src="${sprite}" alt="${poke.name}">
      <div class="poke-name">${poke.name}</div>
    `;

    container.appendChild(div);
  });
}

async function addPokemonPrompt() {
  const name = prompt("Enter Pokémon name (e.g. pikachu):");
  if (!name) return;

  const lower = name.toLowerCase();

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${lower}`);
    if (!res.ok) throw new Error();

    const data = await res.json();

    const team = getPokemonTeam();

    team.push({
      name: data.name,
      id: data.id
    });

    savePokemonTeam(team);
    renderPokemonTeam();

  } catch {
    console.error("Invalid Pokémon name");
  }
}

function removePokemon(idx) {
  const team = getPokemonTeam();
  team.splice(idx, 1);
  savePokemonTeam(team);
  renderPokemonTeam();
}

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
  const [animeList, mangaList ,bookList] = await Promise.all([
    api.getAnime(),
    api.getManga(),
    api.getBooks()
  ]);
  
  const animeCountEl = document.getElementById('anime-count');
  const mangaCountEl = document.getElementById('manga-count');
  const bookCountEl = document.getElementById('books-count');
  if (animeCountEl) animeCountEl.textContent = animeList.length;
  if (mangaCountEl) mangaCountEl.textContent = mangaList.length;
  if (bookCountEl) bookCountEl.textContent = bookList.length;

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
  renderPokemonTeam();
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
        <button class="btn ghost" onclick="pages.removeTopItemConfirm(${idx})">Remove</button>
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

// NEW: Confirmation wrapper for removing Top List item
function removeTopItemConfirm(idx) {
    showConfirmModal(
        'Confirm Removal',
        `Are you sure you want to remove item #${idx + 1} from the Top 10 list?`,
        () => {
            removeTopItem(idx);
        }
    );
}

// Original removal logic (now called from the confirmation modal)
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

/* ---------- GENERAL UTILITIES ---------- */

// NEW: Generic confirmation modal function
function showConfirmModal(title, message, onConfirm) {
    // Remove any existing modals first
    document.querySelector('.modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';

    // Tailwind-like styling for buttons and modal for consistency
    const buttonStyle = `
        padding: 8px 16px; 
        border-radius: 6px; 
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width:350px;">
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            <h2 style="margin-bottom:12px; color:var(--text-color);">${title}</h2>
            <p style="color:var(--muted); margin-bottom: 24px;">${message}</p>
            <div style="display:flex; justify-content:flex-end; gap:12px;">
                <button 
                    type="button" 
                    class="btn ghost" 
                    onclick="this.closest('.modal').remove()"
                    style="${buttonStyle} background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#e6eef8;"
                >
                    Cancel
                </button>
                <button 
                    type="button" 
                    class="btn" 
                    id="confirm-action-btn"
                    style="${buttonStyle} background:#e74c3c; color:white; border:1px solid #c0392b;"
                >
                    Confirm
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('confirm-action-btn').addEventListener('click', () => {
        onConfirm();
        modal.remove();
    });
}

// Helper to create and show a modal form
function showEntryModal(type, targetYearSection, onSubmit) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const isAnime = type === 'anime';
    const mediaType = isAnime ? 'Anime' : 'Manga';
    const unit = isAnime ? 'Episodes' : 'Chapters';
    const imageFieldLabel = isAnime ? 'Poster' : 'Cover';

    const inputStyle = `width:100%; padding:10px 12px; margin-top:4px; border-radius:8px; background:var(--glass); border:1px solid rgba(255,255,255,0.08); outline:none; color:#e6eef8;`;
    const labelStyle = `display:block; font-size:14px; font-weight:500; color:var(--muted);`;

    modal.innerHTML = `
        <div class="modal-content" style="max-width:480px;">
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
                <div style="margin-bottom:16px;">
                    <label for="year" style="${labelStyle}">Year Section (e.g. 2025)</label>
                    <input type="text" id="year" name="year" value="${targetYearSection || ''}"
                           style="${inputStyle}"
                           onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
                </div>
                <div style="margin-bottom:24px;">
                    <label style="${labelStyle}">${imageFieldLabel} (optional)</label>
                    <div style="margin-top:8px; display:flex; align-items:center; gap:12px;">
                        <label style="cursor:pointer; padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); font-size:13px; color:#e6eef8; white-space:nowrap;">
                            📁 Choose file
                            <input type="file" id="entry-image-file" accept="image/*" style="display:none;">
                        </label>
                        <span id="entry-image-name" style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No file chosen</span>
                    </div>
                    <div id="entry-image-preview" style="margin-top:10px; display:none;">
                        <img id="entry-image-preview-img" style="max-height:120px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); object-fit:cover;">
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:8px;">
                    <button type="button" class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn" style="background:var(--accent); color:var(--card); font-weight:700; border:1px solid var(--accent);">Add ${mediaType}</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const fileInput = document.getElementById('entry-image-file');
    fileInput.addEventListener('change', () => {
        const f = fileInput.files[0];
        document.getElementById('entry-image-name').textContent = f ? f.name : 'No file chosen';
        const preview = document.getElementById('entry-image-preview');
        const previewImg = document.getElementById('entry-image-preview-img');
        if (f) {
            previewImg.src = URL.createObjectURL(f);
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    });

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

        if (!title) return console.error('Title is required!');

        let uploadedImagePath = null;
        const file = fileInput.files[0];
        if (file) {
            const submitBtn = e.target.querySelector('[type="submit"]');
            submitBtn.textContent = 'Uploading…';
            submitBtn.disabled = true;
            try {
                const result = await api.uploadImage(file);
                if (result.path) uploadedImagePath = result.path;
            } catch (err) {
                console.error('Image upload failed', err);
            }
            submitBtn.textContent = `Add ${mediaType}`;
            submitBtn.disabled = false;
        }

        await onSubmit(title, watched, total, year, uploadedImagePath);
        modal.remove();
    });
}


/* ---------- YEAR sections (user-created) ---------- */
async function promptAddYear(type) {
  const label = prompt('Enter a label for this year section (e.g. 2025):');
  if (!label) return;
  await api.addYear(type, label);
  if (type === 'anime') initAnimePage();
  else initMangaPage();
}

// MODIFIED: Uses custom confirmation modal
async function promptDeleteYear(type, label) {
    showConfirmModal(
        'Confirm Section Deletion',
        `Are you sure you want to remove the year section "${label}"? This action cannot be undone and the grouping will be removed.`,
        async () => {
            await api.deleteYear(type, label);
            if (type === 'anime') initAnimePage();
            else initMangaPage();
        }
    );
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
    // Only show delete button for user-defined years (those in the API list and not 'Ungrouped')
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
      // const posterClass = isFinished ? '' : 'watching-border'; // OLD: border class

      // NEW: Indicator HTML
      const watchingDot = isFinished ? '' : '<div class="watching-dot"></div>'; 
      // NOTE: The CSS for .watching-dot needs to be added to your stylesheet (e.g., style.css)
      /* .watching-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 12px;
        height: 12px;
        background-color: #e74c3c; // Red color
        border-radius: 50%;
        border: 2px solid var(--card); // Optional: border to make it pop on the poster
        z-index: 10;
      }
      .card-poster {
        position: relative; // Needed for absolute positioning of the dot
        // ... existing styles for card-poster ...
      }
      */
      
      const posterHtml = `
        <div class="card-poster" style="position: relative;">
          <img src="${poster}" alt="${escapeHtml(item.title)}">
          ${watchingDot}
        </div>
      `;
      // --- END NEW HTML ---

      const epsWatched = item.episodes_watched || 0;
      const epsTotal = item.total_episodes !== null ? item.total_episodes : 'Unknown';

      card.innerHTML = `
        ${posterHtml}
        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="small">Episodes: <span id="ep_${item.id}">${epsWatched}</span></div>
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
    showEntryModal('anime', targetYearSection, async (title, episodes_watched, total_episodes, year, uploadedImagePath) => {
        const payload = {
            title,
            episodes_watched,
            total_episodes: total_episodes !== null ? total_episodes : null,
            year: year,
            yearSection: year || targetYearSection || null,
            poster: uploadedImagePath || null
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

// MODIFIED: Uses custom confirmation modal
async function deleteAnimeConfirm(id) {
    showConfirmModal(
        'Confirm Anime Deletion',
        'Are you sure you want to permanently delete this anime entry? This action cannot be undone.',
        async () => {
            await api.deleteAnime(id);
            initAnimePage();
        }
    );
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
      // const posterClass = isFinished ? '' : 'watching-border'; // OLD: border class

      // NEW: Indicator HTML
      const watchingDot = isFinished ? '' : '<div class="watching-dot"></div>';
      
      const posterHtml = `
        <div class="card-poster" style="position: relative;">
          <img src="${poster}" alt="${escapeHtml(item.title)}">
          ${watchingDot}
        </div>
      `;
      // --- END NEW HTML ---
      
      card.innerHTML = `
        ${posterHtml}
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
    showEntryModal('manga', targetYearSection, async (title, chapters_read, total_chapters, year, uploadedImagePath) => {
        const payload = {
            title,
            chapters_read,
            year: year,
            yearSection: year || targetYearSection || null,
            cover: uploadedImagePath || null
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

// MODIFIED: Uses custom confirmation modal
async function deleteMangaConfirm(id) {
    showConfirmModal(
        'Confirm Manga Deletion',
        'Are you sure you want to permanently delete this manga entry? This action cannot be undone.',
        async () => {
            await api.deleteManga(id);
            initMangaPage();
        }
    );
}

/* ---------- BOOKS page ---------- */

async function initBooksPage() {

  const container = document.getElementById('books-year-sections');
  if (!container) return;

  container.innerHTML = '';

  const [years, list] = await Promise.all([
    api.getYears('books'),
    api.getBooks()
  ]);

  const sectionsSet = new Set();

  if (Array.isArray(years)) {
    years.forEach(y => sectionsSet.add(String(y).trim()));
  }

  list.forEach(item => {
    const section = String(item.yearSection || 'Ungrouped').trim();
    sectionsSet.add(section);
  });

  const sections = Array.from(sectionsSet).sort().reverse();

  for (const yearLabel of sections) {

    const sec = document.createElement('div');
    sec.className = 'year-section card';

    const head = document.createElement('div');
    head.className = 'year-head';

    const h = document.createElement('h3');
    h.textContent = yearLabel;

    const actionWrap = document.createElement('div');

    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = `Add book to ${yearLabel}`;
    addBtn.onclick = () => promptAddBook(yearLabel);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = 'Remove Year';
    delBtn.onclick = () => promptDeleteYear('books', yearLabel);

    actionWrap.appendChild(addBtn);

    if (yearLabel !== 'Ungrouped' && years.includes(yearLabel)) {
      actionWrap.appendChild(delBtn);
    }

    head.appendChild(h);
    head.appendChild(actionWrap);

    sec.appendChild(head);

    const gallery = document.createElement('div');
    gallery.className = 'year-gallery';

    const items = list.filter(b => {
      const itemSection = String(b.yearSection || 'Ungrouped').trim();
      return itemSection === yearLabel;
    });

    items.forEach(item => {

      const card = document.createElement('div');
      card.className = 'card';

      const cover = item.cover || '/placeholders/no.png';

      const readingDot = item.finished ? '' : '<div class="watching-dot"></div>';

      card.innerHTML = `
        <div class="card-poster" style="position:relative;">
          <img src="${cover}" alt="${escapeHtml(item.title)}">
          ${readingDot}
        </div>

        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>

          <div class="small">
            Pages read: ${item.pages_read || 0}
          </div>

          <div style="margin-top:8px;" class="controls">
            <button class="btn"
              onclick="pages.promptUpdateBook('${item.id}','${item.pages_read || 0}')">
              Update pages
            </button>

            <button class="btn ghost"
              onclick="pages.toggleBookFinished('${item.id}')">
              ${item.finished ? 'Mark reading' : 'Mark finished'}
            </button>

            <button class="btn ghost"
              onclick="pages.deleteBookConfirm('${item.id}')">
              Delete
            </button>
          </div>
        </div>
      `;

      gallery.appendChild(card);
    });

    sec.appendChild(gallery);
    container.appendChild(sec);
  }
}

async function promptAddBook(targetYearSection = null) {
  const modal = document.createElement('div');
  modal.className = 'modal';

  const inputStyle = `width:100%; padding:10px 12px; margin-top:4px; border-radius:8px; background:var(--glass); border:1px solid rgba(255,255,255,0.08); outline:none; color:#e6eef8;`;
  const labelStyle = `display:block; font-size:14px; font-weight:500; color:var(--muted);`;

  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px;">
      <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      <h2>Add Book</h2>
      <form id="add-book-form" style="margin-top:16px;">

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Title <span style="color:red;">*</span></label>
          <input type="text" id="book-title" required style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Pages Read (optional)</label>
          <input type="number" id="book-pages" value="0" style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Year Section (e.g. 2025)</label>
          <input type="text" id="book-year" value="${targetYearSection || ''}" style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:24px;">
          <label style="${labelStyle}">Cover (optional)</label>
          <div style="margin-top:8px; display:flex; align-items:center; gap:12px;">
            <label style="cursor:pointer; padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); font-size:13px; color:#e6eef8; white-space:nowrap;">
              📁 Choose file
              <input type="file" id="book-image-file" accept="image/*" style="display:none;">
            </label>
            <span id="book-image-name" style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No file chosen</span>
          </div>
          <div id="book-image-preview" style="margin-top:10px; display:none;">
            <img id="book-image-preview-img" style="max-height:120px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); object-fit:cover;">
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:8px;">
          <button type="button" class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn" style="background:var(--accent); color:var(--card); font-weight:700; border:1px solid var(--accent);">Add Book</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const fileInput = document.getElementById('book-image-file');
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    document.getElementById('book-image-name').textContent = f ? f.name : 'No file chosen';
    const preview = document.getElementById('book-image-preview');
    const previewImg = document.getElementById('book-image-preview-img');
    if (f) {
      previewImg.src = URL.createObjectURL(f);
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });

  document.getElementById('add-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('book-title').value.trim();
    if (!title) return;
    const pages = Number(document.getElementById('book-pages').value) || 0;
    const year = document.getElementById('book-year').value.trim() || null;

    let cover = null;
    const file = fileInput.files[0];
    if (file) {
      const submitBtn = e.target.querySelector('[type="submit"]');
      submitBtn.textContent = 'Uploading…';
      submitBtn.disabled = true;
      try {
        const result = await api.uploadImage(file);
        if (result.path) cover = result.path;
      } catch (err) {
        console.error('Cover upload failed', err);
      }
      submitBtn.textContent = 'Add Book';
      submitBtn.disabled = false;
    }

    await api.addBook({
      title,
      pages_read: pages,
      yearSection: year || targetYearSection || null,
      cover
    });
    modal.remove();
    initBooksPage();
  });
}

async function promptUpdateBook(id, current) {

  const v = prompt("Enter pages read:", current || 0);
  const n = Number(v);

  if (isNaN(n)) return;

  await api.patchBook(id, { pages_read: n });

  initBooksPage();
}

async function toggleBookFinished(id) {

  const list = await api.getBooks();

  const b = list.find(x => x.id === id);

  if (!b) return;

  await api.patchBook(id, { finished: !b.finished });

  initBooksPage();
}

async function deleteBookConfirm(id) {

  showConfirmModal(
    "Confirm Book Deletion",
    "Are you sure you want to delete this book?",
    async () => {
      await api.deleteBook(id);
      initBooksPage();
    }
  );
}

/* ---------- Youtube page ---------- */
async function initYoutubePage() {

  const container = document.getElementById('youtube-root');
  if (!container) return;

  container.classList.add('youtube-page');
  container.innerHTML = '';

  // 🔥 Fetch BOTH datasets
  const [youtubeList, channelList] = await Promise.all([
    api.getYoutube(),
    api.getYoutubeChannels()
  ]);

  const query = (window.youtubeSearch || '').trim().toLowerCase();

  // 🔍 Filter separately
  const filteredVideos = youtubeList.filter(item => {
    const title = (item.title || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    return !query || title.includes(query) || type.includes(query);
  });

  const filteredChannels = channelList.filter(item => {
    const title = (item.name || '').toLowerCase();
    return !query || title.includes(query);
  });

  const series = filteredVideos.filter(v => v.type === 'series');
  const videos = filteredVideos.filter(v => v.type === 'video');
  const channels = filteredChannels; // already separate now

  function createChannelCard(item) {
    const card = document.createElement('div');
    card.className = 'card';

    const logo = item.poster || '/placeholders/no.png';
    const channelUrl = item.url || '#';

    card.innerHTML = `
      <div class="card-poster" style="display:flex; align-items:center; justify-content:center;">
        <a href="${channelUrl}" target="_blank" rel="noopener noreferrer">
          <img src="${logo}" alt="${escapeHtml(item.name)}"
            style="width:110px; height:110px; border-radius:999px; object-fit:cover;">
        </a>
      </div>

      <div class="card-info">
        <div class="title">${escapeHtml(item.name)}</div>

        <div class="small">YouTube Channel</div>

        <div style="margin-top:8px;" class="controls">
          <a href="${channelUrl}" target="_blank">
            <button class="btn">Open Channel</button>
          </a>

          <button class="btn ghost"
            onclick="pages.deleteYoutubeChannel('${item.id}')">
            Delete
          </button>
        </div>
      </div>
    `;
    return card;
  }

  function createSection(title, items, mode) {

    const section = document.createElement('div');
    section.className = 'year-section card';

    const h = document.createElement('h3');
    h.textContent = title;

    const gallery = document.createElement('div');
    gallery.className = 'year-gallery';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.6';
      empty.style.padding = '12px';
      empty.textContent = 'No items yet';
      gallery.appendChild(empty);
    }

    items.forEach(item => {

      if (mode === 'channel') {
        gallery.appendChild(createChannelCard(item));
        return;
      }

      const card = document.createElement('div');
      card.className = 'card';

      const poster = item.poster || '/placeholders/no.png';

      card.innerHTML = `
        <div class="card-poster">
          <img src="${poster}" alt="${escapeHtml(item.title)}">
        </div>

        <div class="card-info">
          <div class="title">${escapeHtml(item.title)}</div>

          <div class="small">
            Year: ${item.year || 'Unknown'}
          </div>

          <div style="margin-top:8px;" class="controls">
            <a href="${item.url}" target="_blank">
              <button class="btn">Watch</button>
            </a>

            <button class="btn ghost"
              onclick="pages.deleteYoutube('${item.id}')">
              Delete
            </button>
          </div>
        </div>
      `;

      gallery.appendChild(card);
    });

    section.appendChild(h);
    section.appendChild(gallery);

    return section;
  }

  container.appendChild(createSection('Channels', channels, 'channel'));
  container.appendChild(createSection('Videos', videos, 'video'));
  container.appendChild(createSection('Series', series, 'series'));
}

function searchYoutube(value) {
  window.youtubeSearch = value || '';
  initYoutubePage();
}

async function deleteYoutube(id) {
  await api.deleteYoutube(id);
  initYoutubePage();
}

async function deleteYoutubeChannel(id) {
  await fetch('/api/channels/' + id, { method: 'DELETE' });
  initYoutubePage();
}

async function promptAddYoutubeVideo() {
  const modal = document.createElement('div');
  modal.className = 'modal';

  const inputStyle = `width:100%; padding:10px 12px; margin-top:4px; border-radius:8px; background:var(--glass); border:1px solid rgba(255,255,255,0.08); outline:none; color:#e6eef8;`;
  const labelStyle = `display:block; font-size:14px; font-weight:500; color:var(--muted);`;

  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px;">
      <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      <h2>Add Video / Series</h2>
      <form id="add-yt-video-form" style="margin-top:16px;">

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Title <span style="color:red;">*</span></label>
          <input type="text" id="yt-title" required style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Type</label>
          <select id="yt-type" style="${inputStyle} cursor:pointer;">
            <option value="video">Video</option>
            <option value="series">Series</option>
          </select>
        </div>

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Link (optional)</label>
          <input type="url" id="yt-url" placeholder="https://youtube.com/..." style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Year (optional)</label>
          <input type="text" id="yt-year" placeholder="e.g. 2024" style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:24px;">
          <label style="${labelStyle}">Thumbnail (optional)</label>
          <div style="margin-top:8px; display:flex; align-items:center; gap:12px;">
            <label style="cursor:pointer; padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); font-size:13px; color:#e6eef8; white-space:nowrap;">
              📁 Choose file
              <input type="file" id="yt-thumb-file" accept="image/*" style="display:none;">
            </label>
            <span id="yt-thumb-name" style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No file chosen</span>
          </div>
          <div id="yt-thumb-preview" style="margin-top:10px; display:none;">
            <img id="yt-thumb-preview-img" style="max-height:120px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); object-fit:cover;">
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:8px;">
          <button type="button" class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn" style="background:var(--accent); color:var(--card); font-weight:700; border:1px solid var(--accent);">Add</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const fileInput = document.getElementById('yt-thumb-file');
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    document.getElementById('yt-thumb-name').textContent = f ? f.name : 'No file chosen';
    const preview = document.getElementById('yt-thumb-preview');
    const previewImg = document.getElementById('yt-thumb-preview-img');
    if (f) {
      previewImg.src = URL.createObjectURL(f);
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });

  document.getElementById('add-yt-video-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('yt-title').value.trim();
    if (!title) return;
    const type = document.getElementById('yt-type').value;
    const url = document.getElementById('yt-url').value.trim() || null;
    const year = document.getElementById('yt-year').value.trim() || null;

    let poster = null;
    const file = fileInput.files[0];
    if (file) {
      const submitBtn = e.target.querySelector('[type="submit"]');
      submitBtn.textContent = 'Uploading…';
      submitBtn.disabled = true;
      try {
        const result = await api.uploadImage(file);
        if (result.path) poster = result.path;
      } catch (err) {
        console.error('Thumbnail upload failed', err);
      }
      submitBtn.textContent = 'Add';
      submitBtn.disabled = false;
    }

    await api.addYoutube({ title, url, type, year, poster });
    modal.remove();
    initYoutubePage();
  });
}

async function promptAddYoutubeChannel() {
  const modal = document.createElement('div');
  modal.className = 'modal';

  const inputStyle = `width:100%; padding:10px 12px; margin-top:4px; border-radius:8px; background:var(--glass); border:1px solid rgba(255,255,255,0.08); outline:none; color:#e6eef8;`;
  const labelStyle = `display:block; font-size:14px; font-weight:500; color:var(--muted);`;

  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px;">
      <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      <h2>Add YouTube Channel</h2>

      <form id="add-youtube-channel-form" style="margin-top:16px;">

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Channel Name <span style="color:red;">*</span></label>
          <input type="text" id="channel-name" required style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:16px;">
          <label style="${labelStyle}">Channel URL <span style="color:red;">*</span></label>
          <input type="url" id="channel-url" required placeholder="https://youtube.com/@..." style="${inputStyle}"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'">
        </div>

        <div style="margin-bottom:24px;">
          <label style="${labelStyle}">Logo / Poster (optional)</label>
          <div style="margin-top:8px; display:flex; align-items:center; gap:12px;">
            <label style="cursor:pointer; padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); font-size:13px; color:#e6eef8; white-space:nowrap;">
              📁 Choose file
              <input type="file" id="channel-image-file" accept="image/*" style="display:none;">
            </label>
            <span id="channel-image-name" style="font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No file chosen</span>
          </div>
          <div id="channel-image-preview" style="margin-top:10px; display:none;">
            <img id="channel-image-preview-img" style="max-height:120px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); object-fit:cover;">
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:8px;">
          <button type="button" class="btn ghost" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn" style="background:var(--accent); color:var(--card); font-weight:700; border:1px solid var(--accent);">Save</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const fileInput = document.getElementById('channel-image-file');
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    document.getElementById('channel-image-name').textContent = f ? f.name : 'No file chosen';
    const preview = document.getElementById('channel-image-preview');
    const previewImg = document.getElementById('channel-image-preview-img');
    if (f) {
      previewImg.src = URL.createObjectURL(f);
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });

  document.getElementById('add-youtube-channel-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('channel-name').value.trim();
    const url = document.getElementById('channel-url').value.trim();
    if (!name || !url) return;

    let poster = null;
    const file = fileInput.files[0];
    if (file) {
      const submitBtn = e.target.querySelector('[type="submit"]');
      submitBtn.textContent = 'Uploading…';
      submitBtn.disabled = true;
      try {
        const result = await api.uploadImage(file);
        if (result.path) poster = result.path;
      } catch (err) {
        console.error('Logo upload failed', err);
      }
      submitBtn.textContent = 'Save';
      submitBtn.disabled = false;
    }

    await api.addYoutubeChannel({ name, url, poster });
    modal.remove();
    initYoutubePage();
  });
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
  removeTopItemConfirm, // Exporting the confirmation wrapper for Top List removal
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
  promptDeleteYear,
  initBooksPage,
  promptAddBook,
  promptUpdateBook,
  toggleBookFinished,
  deleteBookConfirm,
  initYoutubePage,
  searchYoutube,
  promptAddYoutubeVideo,
  promptAddYoutubeChannel,
  deleteYoutube,
  deleteYoutubeChannel,
  addPokemonPrompt,
  removePokemon,
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('home-notes')) pages.initHome();
  if (document.getElementById('year-sections')) pages.initAnimePage();
  if (document.getElementById('manga-year-sections')) pages.initMangaPage();
  if (document.getElementById('books-year-sections')) pages.initBooksPage();
  if (document.getElementById('youtube-root')) pages.initYoutubePage();
});