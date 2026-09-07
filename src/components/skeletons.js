/**
 * Skeleton loaders with card-catalog styling.
 */

export function renderSkeletons(count = 3) {
  const container = document.createElement('div');
  container.className = 'cards-grid-skeleton';

  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="catalog-card card-skeleton" aria-hidden="true">
        <div class="card-inner">
          <div class="skeleton-stamp"></div>
          <div class="card-body">
            <div class="skeleton-cover"></div>
            <div class="card-content">
              <div class="skeleton-line skeleton-tag"></div>
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-author"></div>
              <div class="skeleton-line skeleton-meta"></div>
              <div class="skeleton-buttons">
                <div class="skeleton-btn"></div>
                <div class="skeleton-btn"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  return container;
}
