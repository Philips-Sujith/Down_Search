/**
 * DOAB (Directory of Open Access Books) API Client
 * Peer-reviewed academic books & textbooks under open-access licenses.
 * Client proxies via Vite (/api/doab) with direct URL fallback.
 */

const DOAB_PROXY_BASE = '/api/doab/rest/search';
const DOAB_DIRECT_BASE = 'https://directory.doabooks.org/rest/search';
const DOAB_DOMAIN = 'https://directory.doabooks.org';

export async function searchDOAB(query, options = {}) {
  const { signal, limit = 15 } = options;
  const cleanQuery = query.trim();
  if (!cleanQuery) return { count: 0, results: [] };

  const searchParams = new URLSearchParams({
    query: cleanQuery,
    expand: 'metadata,bitstreams',
    limit: String(limit)
  });

  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? (AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : signal) : timeoutSignal;

  let response;
  // Try proxy first (solves CORS in browser), then direct if running outside Vite
  try {
    response = await fetch(`${DOAB_PROXY_BASE}?${searchParams.toString()}`, {
      headers: { 'Accept': 'application/json' },
      signal: combinedSignal
    });
    if (!response.ok && response.status === 404) {
      throw new Error('Proxy not found, try direct');
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    response = await fetch(`${DOAB_DIRECT_BASE}?${searchParams.toString()}`, {
      headers: { 'Accept': 'application/json' },
      signal: combinedSignal
    });
  }

  if (!response.ok) {
    throw new Error(`DOAB returned HTTP ${response.status} (${response.statusText})`);
  }

  const items = await response.json();
  if (!Array.isArray(items) || items.length === 0) {
    return { count: 0, results: [] };
  }

  const books = [];

  for (const item of items) {
    const metadataList = item.metadata || [];
    const bitstreams = item.bitstreams || [];

    // Helper to extract metadata field
    const getMeta = (key) => {
      const match = metadataList.find(m => m.key === key);
      return match ? match.value : null;
    };

    const getMetaAll = (key) => {
      return metadataList.filter(m => m.key === key).map(m => m.value);
    };

    const title = item.name || getMeta('dc.title') || 'Untitled Academic Work';
    const authors = getMetaAll('dc.contributor.author');
    const editors = getMetaAll('dc.contributor.editor');
    const finalAuthors = authors.length > 0 ? authors : (editors.length > 0 ? editors : ['Academic Contributor']);

    const year = getMeta('dc.date.issued') || null;
    const handleUri = getMeta('dc.identifier.uri') || (item.handle ? `${DOAB_DOMAIN}/handle/${item.handle}` : null);

    // Look for thumbnail cover image
    let coverUrl = null;
    const thumbBitstream = bitstreams.find(b =>
      b.bundleName === 'THUMBNAIL' ||
      b.mimeType === 'image/jpeg' ||
      (b.name && b.name.toLowerCase().endsWith('.jpg'))
    );
    if (thumbBitstream && thumbBitstream.retrieveLink) {
      coverUrl = `${DOAB_DOMAIN}${thumbBitstream.retrieveLink}`;
    }

    // Direct readable download formats
    const formats = [];

    // 1. Check bitstreams for direct full-text PDF or EPUB
    for (const b of bitstreams) {
      if (!b.retrieveLink) continue;
      const name = (b.name || '').toLowerCase();
      const mime = (b.mimeType || '').toLowerCase();

      if (mime === 'application/pdf' || (name.endsWith('.pdf') && !name.endsWith('.pdf.jpg'))) {
        if (!formats.some(f => f.key === 'pdf')) {
          formats.push({
            key: 'pdf',
            label: 'Open Access PDF',
            extension: '.pdf',
            url: `${DOAB_DOMAIN}${b.retrieveLink}`,
            mimeType: 'application/pdf',
            fileSize: b.sizeBytes ? formatBytes(b.sizeBytes) : null
          });
        }
      } else if (mime.includes('epub') || name.endsWith('.epub')) {
        if (!formats.some(f => f.key === 'epub')) {
          formats.push({
            key: 'epub',
            label: 'EPUB',
            extension: '.epub',
            url: `${DOAB_DOMAIN}${b.retrieveLink}`,
            mimeType: 'application/epub+zip',
            fileSize: b.sizeBytes ? formatBytes(b.sizeBytes) : null
          });
        }
      }
    }

    // 2. If no direct file bitstream, check handle URI for the open access book
    // DOAB guarantees every book indexed is published under open-access license
    if (formats.length === 0 && handleUri) {
      formats.push({
        key: 'pdf',
        label: 'Download Open Access Book',
        extension: '.pdf',
        url: handleUri,
        mimeType: 'application/pdf',
        fileSize: null
      });
    }

    if (formats.length === 0) continue;

    books.push({
      id: `doab-${item.uuid || item.handle}`,
      title,
      authors: finalAuthors.slice(0, 3),
      year: year ? year.substring(0, 4) : null,
      downloadCount: null,
      coverUrl,
      formats,
      handleUri,
      source: 'Open Access Books',
      sourceKey: 'doab',
      sourceType: 'open_access'
    });
  }

  return {
    count: books.length,
    results: books
  };
}

function formatBytes(bytes) {
  const b = Number(bytes);
  if (isNaN(b) || b <= 0) return null;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
