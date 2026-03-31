const TMDB_KEY  = 'acfb9ea58a3e65219d08463fa400b16c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/';

// Storage helpers
function getWatchlist() {
  try { return JSON.parse(localStorage.getItem('mml_watchlist') || '[]'); }
  catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem('mml_watchlist', JSON.stringify(list));
}

// TMDB API Fetching
async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

// Build a full image URL from a TMDB poster path
function imgUrl(path, size = 'w300') {
  if (!path) return 'https://via.placeholder.com/300x450/151b26/6e7c8e?text=No+Poster';
  return `${IMG_BASE}${size}${path}`;
}

// Navigate to the movie detail page
function goToMoviePage(movie) {
  window.location.href = `movie.html?id=${movie.id}`;
}

// Create a poster card for the home page grids and search results
function createMovieCard(movie) {
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

  card.addEventListener('mouseenter', e => showPreview(e, movie));
  card.addEventListener('mouseleave', hidePreview);
  card.addEventListener('mousemove',  movePreview);
  card.addEventListener('click',      () => goToMoviePage(movie));

  return card;
}

// Hover preview card
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
    const addBtn   = previewCard.querySelector('#previewAddBtn');

    if (addBtn)   addBtn.style.display = 'none';
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

// Show a brief toast notification at the bottom right
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Navbar search overlay
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
          searchResults.appendChild(createMovieCard(movie));
        });
      } catch {
        searchResults.innerHTML = '<p style="padding:0.5rem;color:var(--text-muted)">Search unavailable</p>';
      }
    }, 400);
  });
}

// Load a movie grid section on the home page
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

const discoverBtn = document.getElementById('discoverBtn');
if (discoverBtn) {
  discoverBtn.addEventListener('click', () => {
    document.querySelector('.section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// Movie detail page logic — only runs when on movie.html
if (document.getElementById('movieBanner')) {
  document.addEventListener('DOMContentLoaded', async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const movieId   = urlParams.get('id');

    if (!movieId) { window.location.href = 'index.html'; return; }

    function getList() {
      try { return JSON.parse(localStorage.getItem('mml_watchlist') || '[]'); } catch { return []; }
    }
    function saveList(list) { localStorage.setItem('mml_watchlist', JSON.stringify(list)); }

    function formatMoney(n) {
      if (!n || n === 0) return 'N/A';
      if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
      return '$' + n.toLocaleString();
    }

    function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

    // Fetch full movie details including videos for trailer
    let movie = null;
    try {
      const res = await fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_KEY}&language=en-US&append_to_response=videos`);
      movie = await res.json();
    } catch {
      document.getElementById('movieOverviewText').textContent = 'Could not load movie data.';
      return;
    }

    document.title = `${movie.title} – MyMovieList`;

    // Build the backdrop banner
    const bannerEl = document.getElementById('movieBanner');
    document.getElementById('bannerSkeleton').remove();
    if (movie.backdrop_path) {
      const bImg = document.createElement('img');
      bImg.className = 'movie-banner-img';
      bImg.src = `${IMG_BASE}w1280${movie.backdrop_path}`;
      const grad = document.createElement('div');
      grad.className = 'movie-banner-gradient';
      bannerEl.appendChild(bImg);
      bannerEl.appendChild(grad);
    } else {
      bannerEl.style.background = 'var(--bg-elevated)';
    }

    // Show the poster once it loads, replacing the skeleton
    const posterSkeleton = document.getElementById('posterSkeleton');
    const posterBig      = document.getElementById('moviePosterBig');
    if (movie.poster_path) {
      posterBig.src = `${IMG_BASE}w342${movie.poster_path}`;
      posterBig.alt = movie.title;
      posterBig.onload = () => { posterSkeleton.remove(); posterBig.style.display = 'block'; };
    } else {
      posterSkeleton.remove();
      posterBig.src = 'https://via.placeholder.com/160x240/151b26/6e7c8e?text=No+Poster';
      posterBig.style.display = 'block';
    }

    // Populate title block
    document.getElementById('titleBlock').style.visibility = 'visible';
    document.getElementById('movieTitleH1').textContent = movie.title;

    const score = movie.vote_average ? movie.vote_average.toFixed(1) : null;
    if (score) document.getElementById('movieTmdbScore').textContent = `★ ${score}`;
    if (movie.release_date) document.getElementById('movieYearTag').textContent = movie.release_date.slice(0, 4);
    if (movie.runtime) document.getElementById('movieRuntime').textContent = `${movie.runtime} min`;

    const genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' / ');
    if (genres) {
      const gt = document.getElementById('movieGenreTag');
      gt.textContent = genres;
      gt.style.display = 'inline-block';
    }

    // Description
    document.getElementById('movieOverviewText').textContent = movie.overview || 'No description available.';

    // Animate the score ring
    if (score) {
      const pct  = parseFloat(score) / 10;
      const circ = 2 * Math.PI * 34;
      document.getElementById('scoreArc').setAttribute('stroke-dasharray', `${pct * circ} ${circ}`);
      document.getElementById('scoreRingNum').textContent = score;
    }

    // Information sidebar rows
    document.getElementById('infoStatus').textContent   = movie.status || '–';
    document.getElementById('infoRuntime').textContent  = movie.runtime ? `${movie.runtime} min` : '–';
    document.getElementById('infoReleased').textContent = movie.release_date || '–';
    document.getElementById('infoLanguage').textContent = (movie.original_language || '').toUpperCase() || '–';
    document.getElementById('infoBudget').textContent   = formatMoney(movie.budget);
    document.getElementById('infoRevenue').textContent  = formatMoney(movie.revenue);

    // Show trailer if available on YouTube
    const videos  = movie.videos?.results || [];
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos[0];
    if (trailer) {
      document.getElementById('trailerBlock').style.display = 'block';
      document.getElementById('trailerIframe').src = `https://www.youtube.com/embed/${trailer.key}`;
    }

    // Check if this movie is already in the user's watchlist
    function getMyEntry() {
      return getList().find(m => String(m.tmdb_id) === String(movieId));
    }

    // Update the Add to List button and My List Entry card based on saved data
    function refreshEntryUI() {
      const entry       = getMyEntry();
      const statusBtn   = document.getElementById('listStatusBtn');
      const dropBtn     = document.getElementById('listDropdownBtn');
      const myCard      = document.getElementById('myEntryCard');
      const myStatus    = document.getElementById('myEntryStatus');
      const myScore     = document.getElementById('myEntryScore');
      const lmRemoveBtn = document.getElementById('lmRemove');

      if (entry) {
        statusBtn.textContent = capitalize(entry.status);
        statusBtn.className   = 'list-status-btn';
        dropBtn.className     = 'list-dropdown-btn';
        myCard.style.display  = 'block';
        myStatus.textContent  = capitalize(entry.status);
        myScore.textContent   = entry.score > 0 ? entry.score : '–';
        if (lmRemoveBtn) lmRemoveBtn.style.display = 'inline-block';
      } else {
        statusBtn.textContent = '+ Add to List';
        statusBtn.className   = 'list-status-btn not-listed';
        dropBtn.className     = 'list-dropdown-btn not-listed';
        myCard.style.display  = 'none';
        if (lmRemoveBtn) lmRemoveBtn.style.display = 'none';
      }
    }
    refreshEntryUI();

    let selectedStatus = 'planning';

    function openListModal() {
      const entry  = getMyEntry();
      selectedStatus = entry ? entry.status : 'planning';

      document.getElementById('lmPoster').src           = movie.poster_path ? `${IMG_BASE}w92${movie.poster_path}` : '';
      document.getElementById('lmTitle').textContent    = movie.title;
      document.getElementById('lmYear').textContent     = movie.release_date?.slice(0, 4) || '';
      document.getElementById('lmScore').value          = entry ? (entry.score || 0) : 0;
      document.getElementById('lmScoreDisplay').textContent = (entry && entry.score > 0) ? entry.score : '–';
      document.getElementById('lmNotes').value          = entry ? (entry.notes || '') : '';

      document.querySelectorAll('.status-pill').forEach(p => {
        p.className = 'status-pill';
        if (p.dataset.val === selectedStatus) p.className = `status-pill active-${selectedStatus}`;
      });

      document.getElementById('listModalOverlay').classList.add('open');
    }

    function closeListModal() {
      document.getElementById('listModalOverlay').classList.remove('open');
    }

    // Status pill selection
    document.querySelectorAll('.status-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedStatus = pill.dataset.val;
        document.querySelectorAll('.status-pill').forEach(p => p.className = 'status-pill');
        pill.className = `status-pill active-${selectedStatus}`;
      });
    });

    // Live score display as slider moves
    document.getElementById('lmScore').addEventListener('input', function () {
      const v = parseFloat(this.value);
      document.getElementById('lmScoreDisplay').textContent = v === 0 ? '–' : v;
    });

    // Save entry to localStorage
    document.getElementById('lmSave').addEventListener('click', () => {
      const list  = getList();
      const score = parseFloat(document.getElementById('lmScore').value) || 0;
      const notes = document.getElementById('lmNotes').value;
      const idx   = list.findIndex(m => String(m.tmdb_id) === String(movieId));

      if (idx !== -1) {
        list[idx] = { ...list[idx], status: selectedStatus, score, notes };
        showToast('Entry updated!');
      } else {
        list.push({
          id:          Date.now().toString(),
          tmdb_id:     String(movieId),
          title:       movie.title,
          year:        movie.release_date?.slice(0, 4) || '',
          score,
          status:      selectedStatus,
          genre:       (movie.genres || [])[0]?.name || '',
          notes,
          tmdb_poster: movie.poster_path || '',
          overview:    movie.overview || '',
          dateAdded:   new Date().toISOString()
        });
        showToast(`"${movie.title}" added as ${capitalize(selectedStatus)}!`);
      }
      saveList(list);
      closeListModal();
      refreshEntryUI();
    });

    // Remove entry from localStorage
    document.getElementById('lmRemove').addEventListener('click', () => {
      if (!confirm('Remove from your list?')) return;
      const list = getList().filter(m => String(m.tmdb_id) !== String(movieId));
      saveList(list);
      showToast('Removed from list.');
      closeListModal();
      refreshEntryUI();
    });

    document.getElementById('listStatusBtn').addEventListener('click',  openListModal);
    document.getElementById('listDropdownBtn').addEventListener('click', openListModal);
    document.getElementById('myEntryEditBtn')?.addEventListener('click', openListModal);

    document.getElementById('lmClose').addEventListener('click',  closeListModal);
    document.getElementById('lmCancel').addEventListener('click', closeListModal);
    document.getElementById('listModalOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('listModalOverlay')) closeListModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeListModal(); });
  });
}

window.MML = { tmdbFetch, imgUrl, getWatchlist, saveWatchlist, showToast, showPreview, hidePreview, movePreview, createMovieCard };