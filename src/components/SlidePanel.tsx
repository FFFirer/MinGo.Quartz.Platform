import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

type SlidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string; // Tailwind width class, default 'w-96'
  footer?: React.ReactNode;
};

/**
 * Slide-in panel that slides in from the right and overlays content.
 * - Props: isOpen, onClose, title, children, width (default 'w-96')
 * - Backdrop overlay is shown and Escape closes the panel
 * - When open, a portion of the main content is visually pushed (via simple margin on host, to be kept minimal here)
 */
const SlidePanel: React.FC<SlidePanelProps> = ({ isOpen, onClose, title, children, width = 'w-96', footer }) => {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, handleKey]);

  // If panel is closed, render nothing
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <aside
        className={`pointer-events-auto fixed top-0 right-0 h-full ${width} bg-slate-800 text-slate-50 shadow-xl transform transition-transform duration-300 z-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label={title}
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">{children}</div>

        {/* Footer (optional) */}
        {footer && <div className="border-t border-slate-700 p-4">{footer}</div>}
      </aside>
    </>
  );
};

export default SlidePanel;
