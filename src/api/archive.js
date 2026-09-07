/**
 * Internet Archive (archive.org) — Open Texts API Client
 * Surfaces legally open, non-CDL books and texts with real direct download files.
 * Free, public, CORS-enabled, no auth or API key required.
 */

const IA_SEARCH_BASE = 'https://archive.org/advancedsearch.php';
const IA_METADATA_BASE = 'https://archive.org/metadata';
const IA_DOWNLOAD_BASE = 'https://archive.org/download';

// Mapping IA format descriptions to standardized keys
const IA_READING_FORMATS = [
  {
    key: 'pdf',
    label: 'PDF',
    extension: '.pdf',
    matcher: (fmt, name) => fmt.toLowerCase().includes('pdf') || name.toLowerCase().endsWith('.pdf')
  },
  {
    key: 'epub',
    label: 'EPUB',
    extension: '.epub',
    matcher: (fmt, name) => fmt.toLowerCase().includes('epub') || name.toLowerCase().endsWith('.epub')
  },
  {
    key: 'kindle',
    label: 'Kindle',
    extension: '.mobi',
    matcher: (fmt, name) => fmt.toLowerCase().includes('kindle') || fmt.toLowerCase().includes('mobi') || name.toLowerCase().endsWith('.mobi')
  },
  {
    key: 'djvu',
    label: 'DjVu',
    extension: '.djvu',
    matcher: (fmt, name) => fmt.toLowerCase().includes('djvu') && !name.toLowerCase().endsWith('.txt')
  },
  {
    key: 'txt',
    label: 'Plain Text',
    extension: '.txt',
    matcher: (fmt, name) => (fmt.toLowerCase().includes('text') || name.toLowerCase().endsWith('.txt')) && !name.toLowerCase().endsWith('_meta.xml')
  }
];

export async function searchInternetArchive(query, options = {}) {
  const { signal, maxMetadataItems = 10 } = options;
  const cleanQuery = query.trim();
  if (!cleanQuery) return { count: 0, results: [] };

  // Step A: Search for mediatype:texts excluding access-restricted (CDL/lending) items
  // Using NOT access-restricted-item:true to properly filter Lucene Solr records
  const searchParams = new URLSearchParams({
    q: `${cleanQuery} AND mediatype:texts AND NOT access-restricted-item:true`,
    'fl[]': 'identifier,title,creator,year,format,downloads',
    'sort[]': 'downloads desc',
    rows: '15',
    output: 'json'
  });

  const timeoutSignal = AbortSignal.timeout(15000);
  const combinedSignal = signal ? (AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : signal) : timeoutSignal;

  const response = await fetch(`${IA_SEARCH_BASE}?${searchParams.toString()}`, { signal: combinedSignal });
  if (!response.ok) {
    throw new Error(`Internet Archive returned HTTP ${response.status} (${response.statusText})`);
  }

  const data = await response.json();
  const docs = data.response?.docs || [];
  if (docs.length === 0) {
    return { count: 0, results: [] };
  }

  // Step B: Batch fetch metadata for top candidates to get real direct download files
  const candidateDocs = docs.slice(0, maxMetadataItems);
  const metadataPromises = candidateDocs.map(async (doc) => {
    try {
      const metaRes = await fetch(`${IA_METADATA_BASE}/${encodeURIComponent(doc.identifier)}`, { signal: combinedSignal });
      if (!metaRes.ok) return null;
      const metaJson = await metaRes.json();
      return { doc, metadata: metaJson };
    } catch (err) {
      console.warn(`Could not load metadata for IA identifier ${doc.identifier}:`, err);
      return null;
    }
  });

  const resolved = await Promise.all(metadataPromises);
  const books = [];

  for (const item of resolved) {
    if (!item || !item.metadata) continue;
    const { doc, metadata } = item;
    const metaInfo = metadata.metadata || {};

    // Critical Guardrail: Drop if marked access-restricted-item or missing files
    const isRestricted = metaInfo['access-restricted-item'] === 'true' || metaInfo['access-restricted-item'] === true;
    if (isRestricted) continue;

    const files = metadata.files || [];
    const usableFormats = [];

    for (const fmtConfig of IA_READING_FORMATS) {
      // Find matching files
      const match = files.find(f => {
        const name = (f.name || '').toLowerCase();
        const fmt = (f.format || '').toLowerCase();

        // Skip non-reading archival or metadata files
        if (
          name.endsWith('.xml') ||
          name.endsWith('.torrent') ||
          name.endsWith('.sqlite') ||
          name.endsWith('_thumb.jpg') ||
          name.endsWith('_files.xml') ||
          name.endsWith('.tar') ||
          name.endsWith('.jp2') ||
          name.endsWith('.hocr')
        ) {
          return false;
        }

        return fmtConfig.matcher(fmt, name);
      });

      if (match && !usableFormats.some(u => u.key === fmtConfig.key)) {
        usableFormats.push({
          key: fmtConfig.key,
          label: fmtConfig.label,
          extension: fmtConfig.extension,
          url: `${IA_DOWNLOAD_BASE}/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(match.name)}`,
          mimeType: match.format || fmtConfig.label,
          fileSize: match.size ? formatBytes(match.size) : null
        });
      }
    }

    // Must have at least one valid reading file to show as Instant Download
    if (usableFormats.length === 0) continue;

    // Extract authors / creators
    let authors = [];
    if (Array.isArray(doc.creator)) {
      authors = doc.creator;
    } else if (typeof doc.creator === 'string') {
      authors = [doc.creator];
    } else if (metaInfo.creator) {
      authors = Array.isArray(metaInfo.creator) ? metaInfo.creator : [metaInfo.creator];
    } else {
      authors = ['Unknown Author'];
    }

    // Cover image
    const coverUrl = `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`;

    books.push({
      id: `ia-${doc.identifier}`,
      identifier: doc.identifier,
      title: doc.title || metaInfo.title || 'Untitled Work',
      authors: authors.slice(0, 3),
      year: doc.year || metaInfo.year || null,
      downloadCount: doc.downloads || 0,
      coverUrl,
      formats: usableFormats,
      source: 'Internet Archive',
      sourceKey: 'archive',
      sourceType: 'public_domain',
      archiveDetailsUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`
    });
  }

  return {
    count: data.response?.numFound || books.length,
    results: books
  };
}

function formatBytes(bytes) {
  const b = Number(bytes);
  if (isNaN(b) || b <= 0) return null;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
