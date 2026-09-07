/**
 * Title normalization and deduplication utility.
 * Deduplicates Open Library items if an edition already exists in the Gutendex public-domain set.
 */

export function normalizeTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  let title = rawTitle.toLowerCase();

  // Strip common subtitle delimiters (e.g., "Frankenstein; or, The Modern Prometheus")
  const subtitleDelimiters = [';', ':', '—', '--', ' - '];
  for (const delimiter of subtitleDelimiters) {
    const idx = title.indexOf(delimiter);
    if (idx > 0) {
      title = title.substring(0, idx);
    }
  }

  // Also remove common patterns like "or the modern prometheus"
  title = title.replace(/\bor[, ]+the\b.*$/i, '');

  // Strip leading articles (the, a, an)
  title = title.replace(/^(the|a|an)\s+/i, '');

  // Remove non-alphanumeric characters (keep basic word characters and spaces)
  title = title.replace(/[^\w\s]/g, ' ');

  // Collapse consecutive whitespace
  title = title.replace(/\s+/g, ' ').trim();

  return title;
}

/**
 * Checks whether an Open Library candidate title matches any title in the Gutendex set.
 */
export function isDuplicate(candidateTitle, gutendexTitlesNormalized) {
  const normCandidate = normalizeTitle(candidateTitle);
  if (!normCandidate) return false;

  for (const gTitle of gutendexTitlesNormalized) {
    if (!gTitle) continue;

    // Exact normalized equality
    if (normCandidate === gTitle) return true;

    // If candidate starts with or contains gTitle (with minimum length 4 to avoid tiny word false positives)
    if (gTitle.length >= 4 && normCandidate.length >= 4) {
      if (normCandidate.includes(gTitle) || gTitle.includes(normCandidate)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Deduplicates a list of books against already accepted books.
 * Keeps the first occurrence and drops subsequent duplicates.
 */
export function deduplicateBookList(books) {
  const seenNormalizedTitles = [];
  const uniqueBooks = [];

  for (const book of books) {
    const norm = normalizeTitle(book.title);
    if (!norm) {
      uniqueBooks.push(book);
      continue;
    }

    if (!isDuplicate(book.title, seenNormalizedTitles)) {
      seenNormalizedTitles.push(norm);
      uniqueBooks.push(book);
    }
  }

  return uniqueBooks;
}

/**
 * Filter an array of Open Library book items to exclude those already found in ANY instant download source.
 */
export function deduplicateCatalog(openLibraryResults, allInstantResults) {
  const instantNormalized = allInstantResults.map(b => normalizeTitle(b.title)).filter(Boolean);

  return openLibraryResults.filter(olBook => {
    return !isDuplicate(olBook.title, instantNormalized);
  });
}

