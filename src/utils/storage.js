/**
 * LocalStorage manager for recent searches and user preferences.
 */

const RECENT_KEY = 'instant_shelf_recent_searches';
const MAX_RECENT = 8;

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Could not read recent searches from localStorage:', e);
    return [];
  }
}

export function addRecentSearch(query) {
  if (!query || !query.trim()) return [];
  const clean = query.trim();

  try {
    const current = getRecentSearches();
    const updated = [clean, ...current.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Could not save recent search to localStorage:', e);
    return [];
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch (e) {
    console.warn('Could not clear recent searches:', e);
  }
  return [];
}
