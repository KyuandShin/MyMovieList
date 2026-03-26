const TMDB_KEY = 'acfb9ea58a3e65219d08463fa400b16c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/';

// ---- Storage helpers ----
function getWatchlist() {
  try { return JSON.parse(localStorage.getItem('mml_watchlist') || '[]'); }
  catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem('mml_watchlist', JSON.stringify(list));
}

// ---- TMDB fetch helper ----
async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

// ---- Image URL ----
function imgUrl(path, size = 'w300') {
  if (!path) return 'https://via.placeholder.com/300x450/151b26/6e7c8e?text=No+Poster';
  return `${IMG_BASE}${size}${path}`;
}

// ---- Navigate to movie page ----
function goToMoviePage(movie) {
  window.location.href = `movie.html?id=${movie.id}`;
}

// ---- Render a movie card ----
function createMovieCard(movie, opts = {}) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;

  const score  = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const poster = imgUrl(movie.poster_path, 'w300');

  card.innerHTML = `
    ${score ? `<div class="card-score">★ ${score}</div>` : ''}
    <img src="${poster}" alt="${movie.title}" loading="lazy"/>
    <div class="card-overlay">
      <div class="card-title">${movie.title}</div>
    </div>
  `;

  // Hover preview
  card.addEventListener('mouseenter', e => showPreview(e, movie));
  card.addEventListener('mouseleave', hidePreview);
  card.addEventListener('mousemove',  movePreview);

  // Click → movie page (ignore custom onClick — all clicks go to movie page now)
  card.addEventListener('click', () => goToMoviePage(movie));

  return card;
}

// ---- Preview card ----
const previewCard = document.getElementById('previewCard');
let previewTimeout;

function showPreview(e, movie) {
  clearTimeout(previewTimeout);
  previewTimeout = setTimeout(() => {
    if (!previewCard) return;
    const img      = previewCard.querySelector('#previewImg');
    const title    = previewCard.querySelector('#previewTitle');
    const score    = previewCard.querySelector('#previewScore');
    const year     = previewCard.querySelector('#previewYear');
    const overview = previewCard.querySelector('#previewOverview');

    // Remove add button from home page preview — clicking the card goes to movie page instead
    const addBtn = previewCard.querySelector('#previewAddBtn');
    if (addBtn) addBtn.style.display = 'none';

    if (img)      img.src = imgUrl(movie.poster_path || movie.tmdb_poster, 'w500');
    if (title)    title.textContent = movie.title;
    if (score)    score.textContent = movie.vote_average ? `★ ${movie.vote_average.toFixed(1)}` : '';
    if (year)     year.textContent  = (movie.release_date || '').slice(0, 4) || movie.year || '';
    if (overview) overview.textContent = movie.overview || '—';

    positionPreview(e);
    previewCard.style.display = 'block';
  }, 300);
}

function hidePreview() {
  clearTimeout(previewTimeout);
  if (previewCard) previewCard.style.display = 'none';
}

function movePreview(e) {
  if (previewCard && previewCard.style.display === 'block') positionPreview(e);
}

function positionPreview(e) {
  if (!previewCard) return;
  const pw = 280, ph = 320;
  let x = e.clientX + 16;
  let y = e.clientY - 40;
  if (x + pw > window.innerWidth  - 16) x = e.clientX - pw - 16;
  if (y + ph > window.innerHeight - 16) y = window.innerHeight - ph - 16;
  if (y < 70) y = 70;
  previewCard.style.left = x + 'px';
  previewCard.style.top  = y + 'px';
}

// ---- Toast ----
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ---- Search overlay ----
const searchToggle  = document.getElementById('searchToggle');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

if (searchToggle) {
  searchToggle.addEventListener('click', () => {
    searchOverlay.classList.toggle('open');
    if (searchOverlay.classList.contains('open')) searchInput.focus();
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && searchOverlay?.classList.contains('open')) {
    searchOverlay.classList.remove('open');
  }
});

let searchDebounce;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = searchInput.value.trim();
    if (!q) { searchResults.innerHTML = ''; return; }
    searchDebounce = setTimeout(async () => {
      try {
        const data = await tmdbFetch('/search/movie', { query: q });
        searchResults.innerHTML = '';
        (data.results || []).slice(0, 10).forEach(movie => {
          // Search results also go to movie page
          const card = createMovieCard(movie);
          searchResults.appendChild(card);
        });
      } catch {
        searchResults.innerHTML = '<p style="padding:0.5rem;color:var(--text-muted)">Search unavailable</p>';
      }
    }, 400);
  });
}

// ---- Home page grids ----
async function loadGrid(gridId, endpoint, params = {}) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  try {
    const data = await tmdbFetch(endpoint, params);
    grid.innerHTML = '';
    (data.results || []).slice(0, 10).forEach(movie => {
      grid.appendChild(createMovieCard(movie));
    });
  } catch {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Could not load movies. Check your TMDB API key in app.js.</p>';
  }
}

if (document.getElementById('trendingGrid')) {
  loadGrid('trendingGrid',   '/trending/movie/week');
  loadGrid('topRatedGrid',   '/movie/top_rated');
  loadGrid('nowPlayingGrid', '/movie/now_playing');
}

// ---- Discover button ----
const discoverBtn = document.getElementById('discoverBtn');
if (discoverBtn) {
  discoverBtn.addEventListener('click', () => {
    document.querySelector('.section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// Expose globals
window.MML = { tmdbFetch, imgUrl, getWatchlist, saveWatchlist, showToast, showPreview, hidePreview, movePreview, createMovieCard };