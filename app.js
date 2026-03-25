// =====================================================
// MyMovieList – Shared App Logic (app.js)
// TMDB API key: Replace with your own key from themoviedb.org
// Get a free key at: https://www.themoviedb.org/settings/api
// =====================================================

const TMDB_KEY = 'acfb9ea58a3e65219d08463fa400b16c'; 
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/';

function getWatchlist() {
  try { return JSON.parse(localStorage.getItem('mml_watchlist') || '[]'); }
  catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem('mml_watchlist', JSON.stringify(list));
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

function imgUrl(path, size = 'w300') {
  if (!path) return 'https://via.placeholder.com/300x450/151b26/6e7c8e?text=No+Poster';
  return `${IMG_BASE}${size}${path}`;
}

function createMovieCard(movie, opts = {}) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;

  const score = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const poster = imgUrl(movie.poster_path, 'w300');
  const year = (movie.release_date || '').slice(0, 4);

  card.innerHTML = `
    ${score ? `<div class="card-score">★ ${score}</div>` : ''}
    <img src="${poster}" alt="${movie.title}" loading="lazy"/>
    <div class="card-overlay">
      <div class="card-title">${movie.title}</div>
    </div>
  `;

  card.addEventListener('mouseenter', e => showPreview(e, movie));
  card.addEventListener('mouseleave', hidePreview);
  card.addEventListener('mousemove', movePreview);

  if (opts.onClick) card.addEventListener('click', () => opts.onClick(movie));

  return card;
}

const previewCard = document.getElementById('previewCard');
let previewTimeout;

function showPreview(e, movie) {
  clearTimeout(previewTimeout);
  previewTimeout = setTimeout(() => {
    if (!previewCard) return;
    const poster = previewCard.querySelector('#previewImg') || previewCard.querySelector('img');
    const title  = previewCard.querySelector('#previewTitle');
    const score  = previewCard.querySelector('#previewScore');
    const year   = previewCard.querySelector('#previewYear');
    const overview = previewCard.querySelector('#previewOverview');
    const addBtn = previewCard.querySelector('#previewAddBtn');

    if (poster)   poster.src = imgUrl(movie.poster_path || movie.tmdb_poster, 'w500');
    if (title)    title.textContent = movie.title;
    if (score)    score.textContent = movie.vote_average ? `★ ${movie.vote_average.toFixed(1)}` : (movie.score && movie.score > 0 ? `★ ${movie.score}` : '');
    if (year)     year.textContent = (movie.release_date || '').slice(0,4) || movie.year || '';
    if (overview) overview.textContent = movie.overview || '—';
    if (addBtn) {
      addBtn.onclick = () => {
        addToWatchlist(movie);
        hidePreview();
      };
    }

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
  const pw = 280, ph = 340;
  let x = e.clientX + 16;
  let y = e.clientY - 40;
  if (x + pw > window.innerWidth  - 16) x = e.clientX - pw - 16;
  if (y + ph > window.innerHeight - 16) y = window.innerHeight - ph - 16;
  if (y < 70) y = 70;
  previewCard.style.left = x + 'px';
  previewCard.style.top  = y + 'px';
}

function addToWatchlist(movie) {
  const list = getWatchlist();
  const exists = list.find(m => (m.tmdb_id && m.tmdb_id === movie.id) || m.title === movie.title);
  if (exists) { showToast('Already in your list!'); return; }

  const entry = {
    id: Date.now().toString(),
    tmdb_id: movie.id || null,
    title: movie.title,
    year: (movie.release_date || '').slice(0,4) || movie.year || '',
    score: 0,
    status: 'planning',
    genre: '',
    notes: '',
    tmdb_poster: movie.poster_path || movie.tmdb_poster || '',
    overview: movie.overview || '',
    dateAdded: new Date().toISOString()
  };

  list.push(entry);
  saveWatchlist(list);
  showToast(`"${movie.title}" added to Planning!`);
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

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
          const card = createMovieCard(movie, {
            onClick: (m) => {
              addToWatchlist(m);
              searchOverlay.classList.remove('open');
              searchInput.value = '';
              searchResults.innerHTML = '';
            }
          });
          searchResults.appendChild(card);
        });
      } catch (err) { searchResults.innerHTML = '<p style="padding:0.5rem;color:var(--text-muted)">Search unavailable</p>'; }
    }, 400);
  });
}

async function loadGrid(gridId, endpoint, params = {}) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  try {
    const data = await tmdbFetch(endpoint, params);
    grid.innerHTML = '';
    (data.results || []).slice(0, 10).forEach(movie => {
      const card = createMovieCard(movie, {
        onClick: (m) => addToWatchlist(m)
      });
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Could not load movies. Please check your TMDB API key in app.js.</p>';
  }
}

if (document.getElementById('trendingGrid')) {
  loadGrid('trendingGrid',   '/trending/movie/week');
  loadGrid('topRatedGrid',   '/movie/top_rated');
  loadGrid('nowPlayingGrid', '/movie/now_playing');
}

const discoverBtn = document.getElementById('discoverBtn');
if (discoverBtn) {
  discoverBtn.addEventListener('click', () => {
    document.querySelector('.section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

window.MML = { tmdbFetch, imgUrl, getWatchlist, saveWatchlist, addToWatchlist, showToast, showPreview, hidePreview, movePreview, createMovieCard };