import { searchGutendex } from './api/gutendex.js';
import { searchInternetArchive } from './api/archive.js';
import { searchDOAB } from './api/doab.js';
import { searchOpenLibrary } from './api/openlibrary.js';
import { deduplicateBookList, deduplicateCatalog } from './utils/normalize.js';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from './utils/storage.js';
import { renderInstantCard } from './components/instantCard.js';
import { renderCatalogCard } from './components/catalogCard.js';
import { renderSkeletons } from './components/skeletons.js';
import { renderInstantEmptyState, renderCatalogEmptyState, renderErrorState } from './components/emptyState.js';

// Application State
const state = {
  query: '',
  gutendex: { status: 'idle', books: [], error: null },
  archive: { status: 'idle', books: [], error: null },
  doab: { status: 'idle', books: [], error: null },
  mergedInstant: [], // All deduplicated instant download books across Gutenberg, IA, DOAB
  openLibrary: {
    status: 'idle',
    rawBooks: [],
    filteredBooks: [],
    dedupedCount: 0,
    error: null
  },
  sourceFilter: 'all', // 'all' | 'gutenberg' | 'archive' | 'doab'
  formatFilter: 'all', // 'all' | 'epub' | 'txt' | 'html' | 'pdf'
  sortBy: 'popularity', // 'popularity' | 'title' | 'source'
  abortController: null
};

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const quickChips = document.getElementById('quick-chips');
const recentSearchesContainer = document.getElementById('recent-searches');

const instantCountBadge = document.getElementById('instant-count-badge');
const instantResultsContainer = document.getElementById('instant-results');
const sourceFilterBar = document.getElementById('source-filters');
const formatFilterBar = document.getElementById('format-filters');
const sortSelector = document.getElementById('instant-sort');

const catalogCountBadge = document.getElementById('catalog-count-badge');
const catalogDedupBadge = document.getElementById('catalog-dedup-badge');
const catalogResultsContainer = document.getElementById('catalog-results');
const searchStatusBanner = document.getElementById('search-status-banner');

// Initialize
export function initApp() {
  setupEventListeners();
  renderRecentSearches();

  // Load an initial search that demonstrates both classic fiction and open-access materials
  const initialSearch = 'Frankenstein';
  searchInput.value = initialSearch;
  executeSearch(initialSearch);
}

function setupEventListeners() {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) executeSearch(q);
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
  });

  // Quick suggestion chips
  quickChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-btn');
    if (!chip) return;
    const q = chip.getAttribute('data-query');
    if (q) {
      searchInput.value = q;
      clearSearchBtn.classList.remove('hidden');
      executeSearch(q);
    }
  });

  // Source filters for Instant Download
  if (sourceFilterBar) {
    sourceFilterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.source-btn');
      if (!btn) return;
      const source = btn.getAttribute('data-source');
      if (source && source !== state.sourceFilter) {
        state.sourceFilter = source;
        sourceFilterBar.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderInstantResults();
      }
    });
  }

  // Format filters for Instant Download
  formatFilterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const filter = btn.getAttribute('data-format');
    if (filter && filter !== state.formatFilter) {
      state.formatFilter = filter;
      formatFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderInstantResults();
    }
  });

  // Sort selector
  sortSelector.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderInstantResults();
  });
}

// Execute parallel search across all four APIs
export async function executeSearch(query) {
  if (!query || !query.trim()) return;
  const cleanQuery = query.trim();

  // Cancel any existing pending requests
  if (state.abortController) {
    state.abortController.abort();
  }
  state.abortController = new AbortController();
  const { signal } = state.abortController;

  state.query = cleanQuery;
  updateStatusBanner(cleanQuery);

  // Update recent searches in storage and UI
  addRecentSearch(cleanQuery);
  renderRecentSearches();

  // Reset states
  state.gutendex = { status: 'loading', books: [], error: null };
  state.archive = { status: 'loading', books: [], error: null };
  state.doab = { status: 'loading', books: [], error: null };
  state.mergedInstant = [];

  state.openLibrary = {
    status: 'loading',
    rawBooks: [],
    filteredBooks: [],
    dedupedCount: 0,
    error: null
  };

  // Render skeletons independently
  instantResultsContainer.innerHTML = '';
  instantResultsContainer.appendChild(renderSkeletons(4));
  instantCountBadge.textContent = 'Searching 3 open archives...';
  instantCountBadge.className = 'count-badge count-badge--loading';

  catalogResultsContainer.innerHTML = '';
  catalogResultsContainer.appendChild(renderSkeletons(4));
  catalogCountBadge.textContent = 'Searching Open Library...';
  catalogCountBadge.className = 'count-badge count-badge--loading';
  catalogDedupBadge.classList.add('hidden');

  // Trigger Gutendex
  const gutendexPromise = searchGutendex(cleanQuery, { signal })
    .then((data) => {
      state.gutendex.status = 'success';
      state.gutendex.books = data.results || [];
      recalculateInstantAndCatalog();
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      console.error('Gutendex error:', err);
      state.gutendex.status = 'error';
      state.gutendex.error = err.message || 'Failed to query Project Gutenberg';
      recalculateInstantAndCatalog();
    });

  // Trigger Internet Archive Open Texts
  const archivePromise = searchInternetArchive(cleanQuery, { signal, maxMetadataItems: 10 })
    .then((data) => {
      state.archive.status = 'success';
      state.archive.books = data.results || [];
      recalculateInstantAndCatalog();
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      console.error('Internet Archive error:', err);
      state.archive.status = 'error';
      state.archive.error = err.message || 'Failed to query Internet Archive texts';
      recalculateInstantAndCatalog();
    });

  // Trigger DOAB Open Access Books
  const doabPromise = searchDOAB(cleanQuery, { signal, limit: 12 })
    .then((data) => {
      state.doab.status = 'success';
      state.doab.books = data.results || [];
      recalculateInstantAndCatalog();
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      console.error('DOAB error:', err);
      state.doab.status = 'error';
      state.doab.error = err.message || 'Failed to query DOAB Open Access Books';
      recalculateInstantAndCatalog();
    });

  // Trigger Open Library Catalog
  const openLibraryPromise = searchOpenLibrary(cleanQuery, { signal, limit: 16 })
    .then((data) => {
      state.openLibrary.status = 'success';
      state.openLibrary.rawBooks = data.results || [];
      applyCatalogDeduplication();
      renderCatalogResults();
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      console.error('Open Library error:', err);
      state.openLibrary.status = 'error';
      state.openLibrary.error = err.message || 'Failed to query Open Library catalog';
      renderCatalogResults();
    });

  await Promise.allSettled([gutendexPromise, archivePromise, doabPromise, openLibraryPromise]);
}

// Merge and deduplicate instant results, then re-evaluate catalog deduplication
function recalculateInstantAndCatalog() {
  const allRaw = [
    ...state.gutendex.books,
    ...state.archive.books,
    ...state.doab.books
  ];

  // Deduplicate across all three open download sources by normalized title
  state.mergedInstant = deduplicateBookList(allRaw);

  renderInstantResults();

  // If Open Library results are ready, update catalog deduplication against all instant results
  if (state.openLibrary.rawBooks.length > 0) {
    applyCatalogDeduplication();
    renderCatalogResults();
  }
}

function applyCatalogDeduplication() {
  const rawCount = state.openLibrary.rawBooks.length;
  if (state.mergedInstant.length > 0) {
    state.openLibrary.filteredBooks = deduplicateCatalog(state.openLibrary.rawBooks, state.mergedInstant);
    state.openLibrary.dedupedCount = rawCount - state.openLibrary.filteredBooks.length;
  } else {
    state.openLibrary.filteredBooks = [...state.openLibrary.rawBooks];
    state.openLibrary.dedupedCount = 0;
  }
}

// Render Instant Download Section (merging Gutenberg, Internet Archive, DOAB)
function renderInstantResults() {
  const isStillLoading = 
    state.gutendex.status === 'loading' || 
    state.archive.status === 'loading' || 
    state.doab.status === 'loading';

  // If no books yet and at least one is loading, show skeletons
  if (state.mergedInstant.length === 0 && isStillLoading) {
    instantResultsContainer.innerHTML = '';
    instantResultsContainer.appendChild(renderSkeletons(4));
    instantCountBadge.textContent = 'Searching open sources...';
    instantCountBadge.className = 'count-badge count-badge--loading';
    return;
  }

  // If all 3 errored out, show error state
  const allErrored = 
    state.gutendex.status === 'error' && 
    state.archive.status === 'error' && 
    state.doab.status === 'error';

  if (allErrored) {
    instantCountBadge.textContent = 'Sources unavailable';
    instantCountBadge.className = 'count-badge count-badge--error';
    instantResultsContainer.innerHTML = '';
    instantResultsContainer.appendChild(
      renderErrorState('Open Repositories', 'Could not establish connection to open archive mirrors.', () => executeSearch(state.query))
    );
    return;
  }

  // If search completed and zero results across all 3 open sources
  if (!isStillLoading && state.mergedInstant.length === 0) {
    instantCountBadge.textContent = '0 editions';
    instantCountBadge.className = 'count-badge count-badge--empty';
    instantResultsContainer.innerHTML = '';
    instantResultsContainer.appendChild(renderInstantEmptyState(state.query));
    return;
  }

  // Filter by source
  let filtered = state.mergedInstant;
  if (state.sourceFilter !== 'all') {
    filtered = filtered.filter(b => b.sourceKey === state.sourceFilter);
  }

  // Filter by format
  if (state.formatFilter !== 'all') {
    filtered = filtered.filter(book => book.formats.some(f => f.key === state.formatFilter));
  }

  // Sort books
  const sorted = [...filtered].sort((a, b) => {
    if (state.sortBy === 'popularity') {
      return (b.downloadCount || 0) - (a.downloadCount || 0);
    } else if (state.sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (state.sortBy === 'source') {
      return a.source.localeCompare(b.source);
    }
    return 0;
  });

  // Update badge count
  const loadingSuffix = isStillLoading ? ' (searching...)' : '';
  instantCountBadge.textContent = `${sorted.length} available${loadingSuffix}`;
  instantCountBadge.className = 'count-badge count-badge--success';

  instantResultsContainer.innerHTML = '';

  if (sorted.length === 0) {
    const filterEmpty = document.createElement('div');
    filterEmpty.className = 'shelf-state-box shelf-state--empty';
    filterEmpty.innerHTML = `
      <h4 class="state-title">No books match selected filters</h4>
      <p class="state-desc">Try resetting the format or source filters to view all available open downloads.</p>
    `;
    instantResultsContainer.appendChild(filterEmpty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  sorted.forEach((book) => {
    grid.appendChild(renderInstantCard(book));
  });
  instantResultsContainer.appendChild(grid);
}

// Render Library Catalog Section
function renderCatalogResults() {
  catalogResultsContainer.innerHTML = '';

  if (state.openLibrary.status === 'loading') {
    catalogResultsContainer.appendChild(renderSkeletons(4));
    return;
  }

  if (state.openLibrary.status === 'error') {
    catalogCountBadge.textContent = 'Error';
    catalogCountBadge.className = 'count-badge count-badge--error';
    const errBox = renderErrorState('Open Library Search', state.openLibrary.error, () => {
      executeSearch(state.query);
    });
    catalogResultsContainer.appendChild(errBox);
    return;
  }

  const books = state.openLibrary.filteredBooks;

  // Deduplication indicator
  if (state.openLibrary.dedupedCount > 0) {
    catalogDedupBadge.textContent = `${state.openLibrary.dedupedCount} already in Instant Downloads (omitted)`;
    catalogDedupBadge.classList.remove('hidden');
  } else {
    catalogDedupBadge.classList.add('hidden');
  }

  if (books.length === 0) {
    catalogCountBadge.textContent = '0 records';
    catalogCountBadge.className = 'count-badge count-badge--empty';
    catalogResultsContainer.appendChild(renderCatalogEmptyState(state.query));
    return;
  }

  catalogCountBadge.textContent = `${books.length} entries`;
  catalogCountBadge.className = 'count-badge count-badge--info';

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  books.forEach((book) => {
    grid.appendChild(renderCatalogCard(book));
  });
  catalogResultsContainer.appendChild(grid);
}

// Search status banner update
function updateStatusBanner(q) {
  if (!searchStatusBanner) return;
  searchStatusBanner.innerHTML = `
    <div class="status-banner-content">
      <span class="status-banner-label">ACTIVE SEARCH:</span>
      <span class="status-banner-term">“${escapeHtml(q)}”</span>
      <span class="status-banner-note">• Searching Project Gutenberg, Internet Archive Open Texts, DOAB &amp; Open Library</span>
    </div>
  `;
}

// Recent searches UI
function renderRecentSearches() {
  if (!recentSearchesContainer) return;
  const list = getRecentSearches();

  if (list.length === 0) {
    recentSearchesContainer.innerHTML = '';
    return;
  }

  const itemsHtml = list.map(item => `
    <button type="button" class="recent-tag-btn" data-query="${escapeHtml(item)}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>${escapeHtml(item)}</span>
    </button>
  `).join('');

  recentSearchesContainer.innerHTML = `
    <div class="recent-searches-bar">
      <span class="recent-label">Recent Searches:</span>
      <div class="recent-tags-list">
        ${itemsHtml}
      </div>
      <button type="button" class="recent-clear-btn" id="clear-recent-btn" title="Clear search history">Clear</button>
    </div>
  `;

  recentSearchesContainer.querySelectorAll('.recent-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      if (q) {
        searchInput.value = q;
        clearSearchBtn.classList.remove('hidden');
        executeSearch(q);
      }
    });
  });

  const clearBtn = document.getElementById('clear-recent-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearRecentSearches();
      renderRecentSearches();
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
