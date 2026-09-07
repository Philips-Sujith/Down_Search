/**
 * Component: CatalogCard (Open Library / Internet Archive Results)
 * Clearly and honestly labeled as Borrow / Preview Only — NEVER claimed as instant download.
 */

export function renderCatalogCard(book) {
  const card = document.createElement('article');
  card.className = 'catalog-card library-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${book.title} by ${book.authors.join(', ')} - Library Catalog Borrow and Preview`);

  const authorsStr = book.authors.join(', ');
  const yearStr = book.firstPublishYear ? `First published ${book.firstPublishYear}` : 'Publication date unknown';
  const editionsStr = book.editionCount > 1 ? `${book.editionCount} editions` : '1 edition';

  // Cover element
  const coverHtml = book.coverUrl
    ? `<div class="card-cover-wrapper">
         <img src="${escapeHtml(book.coverUrl)}" alt="Cover of ${escapeHtml(book.title)}" class="card-cover-img" loading="lazy" onerror="this.parentElement.innerHTML = getFallbackCatalogCoverHtml('${escapeHtml(book.title)}', '${escapeHtml(authorsStr)}')">
       </div>`
    : getFallbackCatalogCoverHtml(book.title, authorsStr);

  // Action buttons: Open Library and Internet Archive (if available)
  const iaButtonHtml = book.internetArchiveUrl
    ? `
      <a href="${escapeHtml(book.internetArchiveUrl)}" 
         class="catalog-action-btn catalog-action-btn--archive" 
         target="_blank" 
         rel="noopener noreferrer"
         title="Read or borrow copy on Internet Archive (lending library)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>Read / Borrow on Internet Archive</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-arrow"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
      </a>
    `
    : '';

  const olButtonHtml = `
    <a href="${escapeHtml(book.openLibraryUrl)}" 
       class="catalog-action-btn catalog-action-btn--openlibrary" 
       target="_blank" 
       rel="noopener noreferrer"
       title="View record and editions on Open Library">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>View on Open Library</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-arrow"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
    </a>
  `;

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-stamp card-stamp--borrow">
        <span class="stamp-icon">⚲</span>
        <span class="stamp-text">BORROW / PREVIEW ONLY</span>
      </div>

      <div class="card-body">
        ${coverHtml}

        <div class="card-content">
          <div class="card-header">
            <span class="catalog-call-number">${escapeHtml(book.id.replace('/works/', 'OL-'))}</span>
            <span class="catalog-source-tag" title="Open Library / Internet Archive catalog metadata">Open Library</span>
          </div>

          <h3 class="card-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
          <p class="card-author">${escapeHtml(authorsStr)}</p>

          <div class="card-meta">
            <span class="meta-item meta-year">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${escapeHtml(yearStr)}
            </span>
            <span class="meta-item meta-editions">${escapeHtml(editionsStr)}</span>
          </div>

          <div class="card-actions-zone">
            <div class="actions-label catalog-label">AUTHORIZED LIBRARY LINKS:</div>
            <div class="catalog-button-group">
              ${olButtonHtml}
              ${iaButtonHtml}
            </div>
            <p class="catalog-disclaimer">
              Requires an Open Library or Archive.org account to check out / preview copy.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  return card;
}

function getFallbackCatalogCoverHtml(title, author) {
  return `
    <div class="card-cover-wrapper card-cover-placeholder card-cover-placeholder--catalog">
      <div class="fallback-spine"></div>
      <div class="fallback-title">${escapeHtml(title.substring(0, 45))}</div>
      <div class="fallback-author">${escapeHtml(author.substring(0, 30))}</div>
      <div class="fallback-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
      </div>
    </div>
  `;
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
