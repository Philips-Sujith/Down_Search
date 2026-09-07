/**
 * Gutendex (Project Gutenberg wrapper API)
 * Direct, public-domain books with instant one-click download URLs.
 * Free, public, CORS-enabled, no auth/key required.
 */

const GUTENDEX_BASE = 'https://gutendex.com/books/';

// Format label and priority mapping
const FORMAT_CONFIG = [
  {
    key: 'epub',
    label: 'EPUB',
    extension: '.epub',
    icon: 'book',
    matcher: (mime) => mime.includes('application/epub+zip')
  },
  {
    key: 'txt',
    label: 'Plain Text',
    extension: '.txt',
    icon: 'file-text',
    matcher: (mime) => mime.startsWith('text/plain')
  },
  {
    key: 'html',
    label: 'Read Online (HTML)',
    extension: '.html',
    icon: 'external-link',
    matcher: (mime) => mime.startsWith('text/html')
  },
  {
    key: 'pdf',
    label: 'PDF',
    extension: '.pdf',
    icon: 'file',
    matcher: (mime) => mime.includes('application/pdf')
  },
  {
    key: 'mobi',
    label: 'Kindle / MOBI',
    extension: '.mobi',
    icon: 'tablet',
    matcher: (mime) => mime.includes('application/x-mobipocket-ebook')
  }
];

export async function searchGutendex(query, options = {}) {
  const { signal } = options;
  const url = `${GUTENDEX_BASE}?search=${encodeURIComponent(query.trim())}`;

  // Combine caller signal with a 15-second timeout
  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? (AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal) : timeoutSignal;

  const response = await fetch(url, { signal: combinedSignal });
  if (!response.ok) {
    throw new Error(`Gutendex returned HTTP ${response.status} (${response.statusText})`);
  }

  const data = await response.json();
  const rawResults = data.results || [];

  const books = rawResults.map((item) => {
    // Extract available download formats
    const availableFormats = [];
    const formatsMap = item.formats || {};

    for (const fmt of FORMAT_CONFIG) {
      for (const [mime, fileUrl] of Object.entries(formatsMap)) {
        if (fmt.matcher(mime) && fileUrl && !fileUrl.endsWith('.zip')) {
          // Avoid duplicate entries for the same category
          if (!availableFormats.some(f => f.key === fmt.key)) {
            availableFormats.push({
              key: fmt.key,
              label: fmt.label,
              extension: fmt.extension,
              url: fileUrl,
              mimeType: mime
            });
          }
        }
      }
    }

    // Cover image fallback
    const coverUrl = formatsMap['image/jpeg'] || null;

    // Authors formatting (e.g. "Austen, Jane" -> "Jane Austen")
    const authors = (item.authors || []).map((a) => {
      if (!a.name) return 'Unknown Author';
      if (a.name.includes(',')) {
        const parts = a.name.split(',').map((p) => p.trim());
        return `${parts[1]} ${parts[0]}`;
      }
      return a.name;
    });

    return {
      id: item.id,
      title: item.title || 'Untitled Work',
      authors: authors.length > 0 ? authors : ['Unknown Author'],
      downloadCount: item.download_count || 0,
      coverUrl,
      formats: availableFormats,
      languages: item.languages || ['en'],
      subjects: (item.subjects || []).slice(0, 3),
      source: 'Project Gutenberg',
      sourceKey: 'gutenberg',
      sourceType: 'public_domain'
    };
  });

  return {
    count: data.count || 0,
    results: books
  };
}
