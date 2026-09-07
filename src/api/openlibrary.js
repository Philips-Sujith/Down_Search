/**
 * Open Library Search API
 * Broad catalog metadata, legitimate borrow/read page links on Open Library and Internet Archive.
 * Free, public, CORS-enabled, no auth/key required.
 */

const OPEN_LIBRARY_BASE = 'https://openlibrary.org/search.json';

export async function searchOpenLibrary(query, options = {}) {
  const { signal, limit = 16 } = options;
  const fields = 'title,author_name,key,cover_i,ia,first_publish_year,edition_count';
  const url = `${OPEN_LIBRARY_BASE}?q=${encodeURIComponent(query.trim())}&limit=${limit}&fields=${fields}`;

  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? (AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : signal) : timeoutSignal;

  const response = await fetch(url, { signal: combinedSignal });
  if (!response.ok) {
    throw new Error(`Open Library returned HTTP ${response.status} (${response.statusText})`);
  }

  const data = await response.json();
  const docs = data.docs || [];

  const books = docs.map((doc) => {
    const key = doc.key || '';
    const openLibraryUrl = key.startsWith('/works/')
      ? `https://openlibrary.org${key}`
      : `https://openlibrary.org/search?q=${encodeURIComponent(doc.title || '')}`;

    const iaIdentifier = Array.isArray(doc.ia) && doc.ia.length > 0 ? doc.ia[0] : null;
    const internetArchiveUrl = iaIdentifier
      ? `https://archive.org/details/${encodeURIComponent(iaIdentifier)}`
      : null;

    const coverUrl = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null;

    return {
      id: key,
      title: doc.title || 'Untitled Work',
      authors: Array.isArray(doc.author_name) && doc.author_name.length > 0
        ? doc.author_name
        : ['Unknown Author'],
      firstPublishYear: doc.first_publish_year || null,
      editionCount: doc.edition_count || 1,
      coverUrl,
      openLibraryUrl,
      internetArchiveUrl,
      iaIdentifier,
      hasInternetArchive: Boolean(internetArchiveUrl),
      source: 'Open Library',
      sourceType: 'library_catalog'
    };
  });

  return {
    numFound: data.numFound || 0,
    results: books
  };
}
