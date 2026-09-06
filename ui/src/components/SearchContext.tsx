import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type SearchContextType = {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  // Global keyboard shortcut: Ctrl/Cmd + K to open search, ignore if focus/input is active
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTypingInput = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
      if (isTypingInput) return;
      const isMac = navigator.platform.toLowerCase().includes('mac') || navigator.userAgent.includes('Macintosh');
      const k = e.key?.toLowerCase?.() ?? '';
      if ((isMac && (e.metaKey || e.ctrlKey) && k === 'k') || (!isMac && e.ctrlKey && k === 'k')) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openSearch]);

  return (
    <SearchContext.Provider value={{ isOpen, openSearch, closeSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return ctx;
}

export default SearchContext;
