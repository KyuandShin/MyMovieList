// =====================================================
// MyMovieList – Watchlist Page Logic (watchlist.js)
// =====================================================

document.addEventListener('DOMContentLoaded', function () {

  // ---- State ----
  let currentStatus = 'all';
  let currentSort   = 'title';
  let currentGenre  = '';
  let listFilterVal = '';

  // ---- Storage ----
  function getList() {
    try { return JSON.parse(localStorage.getItem('mml_watchlist') || '[]'); }
    catch { return []; }
  }
  function saveList(list) {
    localStorage.setItem('mml_watchlist', JSON.stringify(list));
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

  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---- Elements ----
  const listContent    = document.getElementById('listContent');
  const emptyState     = document.getElementById('emptyState');
  const statTotal      = document.getElementById('statTotal');
  const statCompleted  = document.getElementById('statCompleted');
  const statMeanScore  = document.getElementById('statMeanScore');
  const statWatching   = document.getElementById('statWatching');

  const modalOverlay   = document.getElementById('modalOverlay');
  const modalTitleEl   = document.getElementById('modalTitle');
  const closeModal     = document.getElementById('closeModal');
  const cancelModal    = document.getElementById('cancelModal');
  const saveMovieBtn   = document.getElementById('saveMovie');

  const movieTitleInp  = document.getElementById('movieTitle');
  const movieYearInp   = document.getElementById('movieYear');
  const movieScoreInp  = document.getElementById('movieScore');
  const scoreDisplay   = document.getElementById('scoreDisplay');
  const movieStatusSel = document.getElementById('movieStatus');
  const movieGenreInp  = document.getElementById('movieGenre');
  const movieNotesInp  = document.getElementById('movieNotes');
  const editIdInp      = document.getElementById('editId');
  const moviePosterInp = document.getElementById('moviePoster');
  const movieOverviewInp = document.getElementById('movieOverview');
  const movieTmdbIdInp = document.getElementById('movieTmdbId');

  const modalMovieSearch   = document.getElementById('modalMovieSearch');
  const modalSearchResults = document.getElementById('modalSearchResults');

  const sortSelect   = document.getElementById('sortSelect');
  const genreFilter  = document.getElementById('genreFilter');
  const listFilter   = document.getElementById('listFilter');

  // ---- Sidebar filter buttons ----
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-status]');
  sidebarItems.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status;
      render();
    });
  });

  if (sortSelect)  sortSelect.addEventListener('change',  () => { currentSort  = sortSelect.value;  render(); });
  if (genreFilter) genreFilter.addEventListener('change', () => { currentGenre = genreFilter.value; render(); });
  if (listFilter)  listFilter.addEventListener('input',   () => { listFilterVal = listFilter.value.trim().toLowerCase(); render(); });

  // ---- Render ----
  function render() {
    let list = getList();

    // Filter
    if (currentStatus !== 'all') list = list.filter(m => m.status === currentStatus);
    if (currentGenre)            list = list.filter(m => m.genre  === currentGenre);
    if (listFilterVal)           list = list.filter(m => m.title.toLowerCase().includes(listFilterVal));

    // Sort
    list.sort((a, b) => {
      if (currentSort === 'score')     return (b.score || 0) - (a.score || 0);
      if (currentSort === 'dateAdded') return new Date(b.dateAdded) - new Date(a.dateAdded);
      if (currentSort === 'year')      return (b.year || 0) - (a.year || 0);
      return a.title.localeCompare(b.title);
    });

    updateStats();
    listContent.innerHTML = '';

    if (list.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    // Group by status
    const statusOrder = ['watching', 'completed', 'planning'];
    const groups = {};
    statusOrder.forEach(s => groups[s] = []);
    list.forEach(m => {
      if (groups[m.status]) groups[m.status].push(m);
      else groups['planning'].push(m);
    });

    const statusesToShow = currentStatus === 'all' ? statusOrder : [currentStatus];

    statusesToShow.forEach(status => {
      const items = groups[status];
      if (!items.length) return;

      const section = document.createElement('div');
      section.className = 'status-group';
      section.innerHTML = `
        <h3 class="status-group-title">${capitalize(status)}</h3>
        <table class="list-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Score</th>
              <th>Year</th>
              <th>Genre</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `;
      listContent.appendChild(section);
      const tbody = section.querySelector('tbody');
      items.forEach(movie => tbody.appendChild(createRow(movie)));
    });
  }

  function createRow(movie) {
    const tr = document.createElement('tr');
    const scoreVal = movie.score > 0 ? movie.score : null;
    const poster = movie.tmdb_poster
      ? `https://image.tmdb.org/t/p/w92${movie.tmdb_poster}`
      : 'https://via.placeholder.com/36x50/151b26/6e7c8e?text=?';

    tr.innerHTML = `
      <td class="td-title">
        <img class="td-poster" src="${poster}" alt="${movie.title}" />
        <span class="td-title-text">${movie.title}</span>
      </td>
      <td class="td-score ${scoreVal ? '' : 'no-score'}">${scoreVal ?? '–'}</td>
      <td style="color:var(--text-muted)">${movie.year || '–'}</td>
      <td style="color:var(--text-muted)">${movie.genre || '–'}</td>
      <td class="td-status"><span class="status-${movie.status}">${capitalize(movie.status)}</span></td>
      <td>
        <div style="display:flex;gap:0.4rem;align-items:center">
          <button class="row-action-btn" title="Edit" data-action="edit" data-id="${movie.id}">✏️</button>
          <button class="row-action-btn" title="Delete" data-action="delete" data-id="${movie.id}">🗑️</button>
        </div>
      </td>
    `;

    // Hover preview on poster
    const img = tr.querySelector('.td-poster');
    img.addEventListener('mouseenter', e => {
      showPreview(e, {
        title: movie.title,
        vote_average: movie.score || 0,
        release_date: movie.year ? `${movie.year}-01-01` : '',
        overview: movie.overview || movie.notes || '',
        poster_path: movie.tmdb_poster || null
      });
    });
    img.addEventListener('mouseleave', hidePreview);
    img.addEventListener('mousemove',  movePreview);

    // Edit / Delete buttons
    tr.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.dataset.action === 'edit')   openEdit(btn.dataset.id);
        if (btn.dataset.action === 'delete') deleteEntry(btn.dataset.id);
      });
    });

    return tr;
  }

  function updateStats() {
    const all = getList();
    if (statTotal)     statTotal.textContent     = all.length;
    if (statCompleted) statCompleted.textContent = all.filter(m => m.status === 'completed').length;
    if (statWatching)  statWatching.textContent  = all.filter(m => m.status === 'watching').length;
    const scored = all.filter(m => m.score > 0);
    if (statMeanScore) statMeanScore.textContent = scored.length
      ? (scored.reduce((s, m) => s + m.score, 0) / scored.length).toFixed(1) : '–';
  }

  // ---- Hover Preview ----
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

      const posterSrc = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/280x160/151b26/6e7c8e?text=No+Poster';

      if (img)      img.src = posterSrc;
      if (title)    title.textContent = movie.title || '';
      if (score)    score.textContent = movie.vote_average > 0 ? `★ ${Number(movie.vote_average).toFixed(1)}` : '';
      if (year)     year.textContent  = (movie.release_date || '').slice(0, 4);
      if (overview) overview.textContent = movie.overview || '—';

      positionPreview(e);
      previewCard.style.display = 'block';
    }, 250);
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

  // ---- Modal ----
  function openModalClear() {
    if (modalTitleEl)     modalTitleEl.textContent = 'Add Movie';
    if (editIdInp)        editIdInp.value = '';
    if (movieTitleInp)    movieTitleInp.value = '';
    if (movieYearInp)     movieYearInp.value = '';
    if (movieScoreInp)    movieScoreInp.value = 0;
    if (scoreDisplay)     scoreDisplay.textContent = '–';
    if (movieStatusSel)   movieStatusSel.value = 'watching';
    if (movieGenreInp)    movieGenreInp.value = '';
    if (movieNotesInp)    movieNotesInp.value = '';
    if (moviePosterInp)   moviePosterInp.value = '';
    if (movieOverviewInp) movieOverviewInp.value = '';
    if (movieTmdbIdInp)   movieTmdbIdInp.value = '';
    if (modalMovieSearch)    modalMovieSearch.value = '';
    if (modalSearchResults)  { modalSearchResults.innerHTML = ''; modalSearchResults.classList.remove('open'); }
    if (modalOverlay)     modalOverlay.classList.add('open');
    if (modalMovieSearch) modalMovieSearch.focus();
  }

  function openEdit(id) {
    const list = getList();
    const m = list.find(x => x.id === id);
    if (!m) return;
    if (modalTitleEl)     modalTitleEl.textContent = 'Edit Movie';
    if (editIdInp)        editIdInp.value = m.id;
    if (movieTitleInp)    movieTitleInp.value  = m.title;
    if (movieYearInp)     movieYearInp.value   = m.year || '';
    if (movieScoreInp)    movieScoreInp.value  = m.score || 0;
    if (scoreDisplay)     scoreDisplay.textContent = m.score > 0 ? m.score : '–';
    if (movieStatusSel)   movieStatusSel.value = m.status;
    if (movieGenreInp)    movieGenreInp.value  = m.genre || '';
    if (movieNotesInp)    movieNotesInp.value  = m.notes || '';
    if (moviePosterInp)   moviePosterInp.value = m.tmdb_poster || '';
    if (movieOverviewInp) movieOverviewInp.value = m.overview || '';
    if (movieTmdbIdInp)   movieTmdbIdInp.value = m.tmdb_id || '';
    if (modalMovieSearch)   modalMovieSearch.value = '';
    if (modalSearchResults) { modalSearchResults.innerHTML = ''; modalSearchResults.classList.remove('open'); }
    if (modalOverlay)     modalOverlay.classList.add('open');
  }

  function closeModalFn() {
    if (modalOverlay) modalOverlay.classList.remove('open');
  }

  function deleteEntry(id) {
    if (!confirm('Remove this movie from your list?')) return;
    let list = getList();
    list = list.filter(m => m.id !== id);
    saveList(list);
    showToast('Movie removed.');
    render();
  }

  // Score slider display
  if (movieScoreInp) {
    movieScoreInp.addEventListener('input', () => {
      const v = parseFloat(movieScoreInp.value);
      if (scoreDisplay) scoreDisplay.textContent = v === 0 ? '–' : v;
    });
  }

  // Save button
  if (saveMovieBtn) {
    saveMovieBtn.addEventListener('click', () => {
      const title = movieTitleInp ? movieTitleInp.value.trim() : '';
      if (!title) {
        if (movieTitleInp) movieTitleInp.focus();
        showToast('Please enter a movie title.');
        return;
      }

      const list = getList();
      const id = editIdInp ? editIdInp.value : '';

      if (id) {
        const idx = list.findIndex(m => m.id === id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            title,
            year:        movieYearInp    ? movieYearInp.value    : list[idx].year,
            score:       movieScoreInp   ? parseFloat(movieScoreInp.value) || 0 : list[idx].score,
            status:      movieStatusSel  ? movieStatusSel.value  : list[idx].status,
            genre:       movieGenreInp   ? movieGenreInp.value   : list[idx].genre,
            notes:       movieNotesInp   ? movieNotesInp.value   : list[idx].notes,
            tmdb_poster: moviePosterInp  ? (moviePosterInp.value || list[idx].tmdb_poster) : list[idx].tmdb_poster,
            overview:    movieOverviewInp? (movieOverviewInp.value || list[idx].overview)  : list[idx].overview,
            tmdb_id:     movieTmdbIdInp  ? (movieTmdbIdInp.value || list[idx].tmdb_id)    : list[idx].tmdb_id
          };
        }
        showToast('Movie updated!');
      } else {
        list.push({
          id:          Date.now().toString(),
          tmdb_id:     movieTmdbIdInp   ? movieTmdbIdInp.value   : null,
          title,
          year:        movieYearInp    ? movieYearInp.value    : '',
          score:       movieScoreInp   ? parseFloat(movieScoreInp.value) || 0 : 0,
          status:      movieStatusSel  ? movieStatusSel.value  : 'watching',
          genre:       movieGenreInp   ? movieGenreInp.value   : '',
          notes:       movieNotesInp   ? movieNotesInp.value   : '',
          tmdb_poster: moviePosterInp  ? moviePosterInp.value  : '',
          overview:    movieOverviewInp? movieOverviewInp.value : '',
          dateAdded:   new Date().toISOString()
        });
        showToast(`"${title}" added!`);
      }

      saveList(list);
      closeModalFn();
      render();
    });
  }

  // Modal TMDB search
  let modalSearchDebounce;
  if (modalMovieSearch) {
    modalMovieSearch.addEventListener('input', () => {
      clearTimeout(modalSearchDebounce);
      const q = modalMovieSearch.value.trim();
      if (!q) { if (modalSearchResults) modalSearchResults.classList.remove('open'); return; }

      modalSearchDebounce = setTimeout(async () => {
        try {
          const TMDB_KEY = '4a5b06e4c3a0fc5ee9b7d1b53a98fd5c';
          const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&language=en-US&query=${encodeURIComponent(q)}`;
          const res  = await fetch(url);
          const data = await res.json();

          if (!modalSearchResults) return;
          modalSearchResults.innerHTML = '';
          const results = (data.results || []).slice(0, 6);
          if (!results.length) { modalSearchResults.classList.remove('open'); return; }

          results.forEach(movie => {
            const year = (movie.release_date || '').slice(0, 4);
            const posterSrc = movie.poster_path
              ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
              : 'https://via.placeholder.com/32x44/151b26/6e7c8e?text=?';

            const item = document.createElement('div');
            item.className = 'modal-search-result-item';
            item.innerHTML = `
              <img class="modal-result-poster" src="${posterSrc}" alt="${movie.title}"/>
              <div class="modal-result-info">
                <div class="modal-result-title">${movie.title}</div>
                <div class="modal-result-year">${year}</div>
              </div>
            `;
            item.addEventListener('click', () => {
              if (movieTitleInp)    movieTitleInp.value    = movie.title;
              if (movieYearInp)     movieYearInp.value     = year;
              if (moviePosterInp)   moviePosterInp.value   = movie.poster_path || '';
              if (movieOverviewInp) movieOverviewInp.value = movie.overview || '';
              if (movieTmdbIdInp)   movieTmdbIdInp.value   = movie.id;
              modalMovieSearch.value = movie.title;
              modalSearchResults.classList.remove('open');
            });
            modalSearchResults.appendChild(item);
          });
          modalSearchResults.classList.add('open');
        } catch {
          if (modalSearchResults) modalSearchResults.classList.remove('open');
        }
      }, 350);
    });
  }

  // Close modal search on outside click
  document.addEventListener('click', e => {
    if (modalSearchResults &&
        !modalMovieSearch?.contains(e.target) &&
        !modalSearchResults.contains(e.target)) {
      modalSearchResults.classList.remove('open');
    }
  });

  // Modal open/close
  document.getElementById('openAddModal')?.addEventListener('click', openModalClear);
  document.getElementById('emptyAddBtn')?.addEventListener('click', openModalClear);
  if (closeModal)   closeModal.addEventListener('click', closeModalFn);
  if (cancelModal)  cancelModal.addEventListener('click', closeModalFn);
  if (modalOverlay) modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModalFn(); });

  // Escape key closes modal
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalFn(); });

  // ---- Init ----
  render();

});