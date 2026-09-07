/**
 * Empty, Error, and Guidance state components.
 */

export function renderInstantEmptyState(query) {
  const div = document.createElement('div');
  div.className = 'shelf-state-box shelf-state--empty';
  div.innerHTML = `
    <div class="state-icon-circle">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    </div>
    <h4 class="state-title">No Public-Domain Edition Found</h4>
    <p class="state-desc">
      Project Gutenberg archives materials that have entered the public domain (typically published before 1929 or released by authors). 
      ${query ? `No matching unrestricted copies were found for "<strong>${escapeHtml(query)}</strong>".` : ''}
    </p>
    <div class="state-advice">
      <span class="advice-arrow">↓</span> Check the <strong>Library Catalog section below</strong> to find authorized borrow and preview copies via Open Library or the Internet Archive.
    </div>
  `;
  return div;
}

export function renderCatalogEmptyState(query) {
  const div = document.createElement('div');
  div.className = 'shelf-state-box shelf-state--empty';
  div.innerHTML = `
    <div class="state-icon-circle">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
    </div>
    <h4 class="state-title">No Catalog Records Found</h4>
    <p class="state-desc">
      Open Library could not find any active catalog entries ${query ? `matching "<strong>${escapeHtml(query)}</strong>"` : ''}. Try checking for typos or searching by author surname.
    </p>
  `;
  return div;
}

export function renderErrorState(serviceName, errorMessage, onRetry) {
  const div = document.createElement('div');
  div.className = 'shelf-state-box shelf-state--error';
  div.innerHTML = `
    <div class="state-icon-circle state-icon--error">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
    </div>
    <h4 class="state-title">${escapeHtml(serviceName)} Temporarily Unavailable</h4>
    <p class="state-desc">
      ${escapeHtml(errorMessage || 'The remote archive did not respond in time.')}
    </p>
    <div class="state-actions">
      <button type="button" class="retry-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        Retry this section
      </button>
    </div>
  `;

  if (typeof onRetry === 'function') {
    const btn = div.querySelector('.retry-btn');
    if (btn) btn.addEventListener('click', onRetry);
  }

  return div;
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
