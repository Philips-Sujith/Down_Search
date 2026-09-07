/**
 * Component: InstantCard (Gutendex, Internet Archive & DOAB Results)
 * Features direct one-click download buttons, format badges, and authentic catalog stamps.
 */

export function renderInstantCard(book) {
  const card = document.createElement('article');
  card.className = `catalog-card instant-card instant-card--${book.sourceKey || 'gutenberg'}`;
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${book.title} by ${book.authors.join(', ')} - Instant Download via ${book.source}`);

  const authorsStr = book.authors.join(', ');
  const downloadCountStr = book.downloadCount ? Number(book.downloadCount).toLocaleString() : null;

  // Cover element
  const coverHtml = book.coverUrl
    ? `<div class="card-cover-wrapper">
         <img src="${escapeHtml(book.coverUrl)}" alt="Cover of ${escapeHtml(book.title)}" class="card-cover-img" loading="lazy" onerror="this.parentElement.innerHTML = getFallbackCoverHtml('${escapeHtml(book.title)}', '${escapeHtml(authorsStr)}')">
       </div>`
    : getFallbackCoverHtml(book.title, authorsStr);

  // Format buttons
  let formatButtonsHtml = '';
  if (book.formats && book.formats.length > 0) {
    formatButtonsHtml = book.formats.map(fmt => {
      const isHtml = fmt.key === 'html';
      const actionText = isHtml ? 'Read HTML' : `Download ${fmt.label}`;
      const iconSvg = getFormatIcon(fmt.key);
      const sizeTag = fmt.fileSize ? `<span class="format-size">${escapeHtml(fmt.fileSize)}</span>` : '';
      return `
        <a href="${escapeHtml(fmt.url)}" 
           class="format-btn format-btn--${fmt.key}" 
           ${isHtml ? 'target="_blank"' : 'download'} 
           rel="noopener noreferrer"
           title="${isHtml ? 'Open in new tab' : 'Instant direct download ' + fmt.extension}">
          ${iconSvg}
          <span>${escapeHtml(actionText)}</span>
          <span class="format-ext">${escapeHtml(fmt.extension)}</span>
          ${sizeTag}
        </a>
      `;
    }).join('');
  } else {
    formatButtonsHtml = `<p class="no-formats-notice">Digital file preparing on archive mirror</p>`;
  }

  // Stamp badge customization based on source
  let stampHtml = '';
  if (book.sourceKey === 'doab') {
    stampHtml = `
      <div class="card-stamp card-stamp--open-access">
        <span class="stamp-icon">🔓</span>
        <span class="stamp-text">OPEN ACCESS • DIRECT GET</span>
      </div>
    `;
  } else if (book.sourceKey === 'archive') {
    stampHtml = `
      <div class="card-stamp card-stamp--archive-open">
        <span class="stamp-icon">✓</span>
        <span class="stamp-text">OPEN ARCHIVE • DIRECT GET</span>
      </div>
    `;
  } else {
    stampHtml = `
      <div class="card-stamp card-stamp--public-domain">
        <span class="stamp-icon">✓</span>
        <span class="stamp-text">PUBLIC DOMAIN • DIRECT GET</span>
      </div>
    `;
  }

  // Call number
  let callNumber = '';
  if (book.sourceKey === 'gutenberg') {
    callNumber = `PG-${book.id}`;
  } else if (book.sourceKey === 'archive') {
    callNumber = `IA-${(book.identifier || book.id || '').replace(/^ia-/, '').substring(0, 16)}`;
  } else {
    callNumber = `DOAB-${book.year || 'OA'}`;
  }

  // Source pill badge
  const sourceBadgeHtml = `
    <span class="catalog-source-tag catalog-source-tag--${book.sourceKey || 'gutenberg'}" title="Verified source: ${escapeHtml(book.source)}">
      ${escapeHtml(book.source)}
    </span>
  `;

  // Meta items
  let metaHtml = '';
  if (downloadCountStr) {
    metaHtml += `
      <span class="meta-item meta-downloads" title="Reader download count on archive">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        ${downloadCountStr} downloads
      </span>
    `;
  }
  if (book.year) {
    metaHtml += `
      <span class="meta-item meta-year" title="Publication year">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${escapeHtml(String(book.year))}
      </span>
    `;
  }
  if (book.languages) {
    metaHtml += `<span class="meta-item meta-lang">${escapeHtml(book.languages.join(', ').toUpperCase())}</span>`;
  }

  card.innerHTML = `
    <div class="card-inner">
      ${stampHtml}

      <div class="card-body">
        ${coverHtml}

        <div class="card-content">
          <div class="card-header">
            <span class="catalog-call-number">${escapeHtml(callNumber)}</span>
            ${sourceBadgeHtml}
          </div>

          <h3 class="card-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
          <p class="card-author">${escapeHtml(authorsStr)}</p>

          <div class="card-meta">
            ${metaHtml}
          </div>

          <div class="card-actions-zone">
            <div class="actions-label">INSTANT FILES (NO ADS / NO WAITING):</div>
            <div class="format-button-group">
              ${formatButtonsHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return card;
}

function getFormatIcon(key) {
  switch (key) {
    case 'epub':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    case 'txt':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    case 'html':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
    case 'pdf':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
    case 'djvu':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
    case 'kindle':
    case 'mobi':
    default:
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
  }
}

function getFallbackCoverHtml(title, author) {
  return `
    <div class="card-cover-wrapper card-cover-placeholder">
      <div class="fallback-spine"></div>
      <div class="fallback-title">${escapeHtml(title.substring(0, 45))}</div>
      <div class="fallback-author">${escapeHtml(author.substring(0, 30))}</div>
      <div class="fallback-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
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
