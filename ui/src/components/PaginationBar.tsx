import React from 'react';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalPages <= 1) return null;

  const startIndex = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = totalItems > 0 ? Math.min(page * pageSize, totalItems) : 0;
  const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);

  return (
    <div className="flex items-center justify-between mt-4 gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={
              p === page
                ? 'px-3 py-1.5 rounded bg-slate-700 text-white'
                : 'px-3 py-1.5 rounded text-slate-300 hover:bg-slate-700'
            }
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="text-sm text-slate-400">
        Showing {startIndex}-{endIndex} of {totalItems} items
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Page size</span>
        <select
          value={pageSize}
          onChange={(e) => {
            const newSize = parseInt(e.target.value, 10);
            onPageSizeChange(newSize);
          }}
          className="bg-slate-800 text-slate-300 rounded px-2 py-1"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PaginationBar;
