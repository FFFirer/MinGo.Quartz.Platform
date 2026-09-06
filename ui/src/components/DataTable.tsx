import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';

export interface DataTableColumn<T> {
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  showBorder?: boolean;
  showHeader?: boolean;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  showBorder = true,
  showHeader = true,
  className = '',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tanstackColumns = useMemo(() => {
    return columns.map((col, index) => {
      const isFnAccessor = typeof col.accessor === 'function';
      const keyAccessor = !isFnAccessor ? col.accessor : undefined;
      const id = keyAccessor ? String(keyAccessor) : `col_${index}`;

      return {
        id,
        accessorKey: keyAccessor,
        accessorFn: isFnAccessor
          ? (row: T) => {
              const val = (col.accessor as (row: T) => React.ReactNode)(row);
              return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
                ? val
                : undefined;
            }
          : undefined,
        header: col.header as any,
        enableSorting: col.sortable ?? (typeof col.accessor === 'string'),
        cell: (info: any) => {
          let value: any;
          const row: T = info.row.original;

          if (isFnAccessor) {
            value = (col.accessor as (row: T) => React.ReactNode)(row);
          } else {
            value = info.getValue();
          }

          if (col.format) {
            return col.format(value);
          }

          return value;
        },
        meta: {
          align: col.align,
          width: col.width,
        },
      };
    });
  }, [columns]);

  const table = useReactTable({
    data,
    columns: tanstackColumns as any,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`${showBorder ? 'border border-slate-700 rounded-lg' : ''} overflow-x-auto ${className}`}>
      <table className="min-w-full">
        {showHeader && (
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-slate-700">
                {headerGroup.headers.map((header) => {
                  const meta = (header.column.columnDef as any).meta || {};
                  const widthClass = meta.width
                    ? typeof meta.width === 'number'
                      ? `w-${meta.width}`
                      : meta.width
                    : '';
                  const alignClass =
                    meta.align === 'center'
                      ? 'text-center'
                      : meta.align === 'right'
                        ? 'text-right'
                        : 'text-left';
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={`${widthClass} ${alignClass} px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider ${
                        canSort ? 'cursor-pointer select-none hover:text-slate-200' : ''
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-slate-500 text-xs">
                            {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : ''}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
        )}
        <tbody className="divide-y divide-slate-700">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-800/50 transition-colors`}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = (cell.column.columnDef as any).meta || {};
                const widthClass = meta.width
                  ? typeof meta.width === 'number'
                    ? `w-${meta.width}`
                    : meta.width
                  : '';
                const alignClass =
                  meta.align === 'center'
                    ? 'text-center'
                    : meta.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                return (
                  <td
                    key={cell.id}
                    className={`${widthClass} ${alignClass} px-3 py-2 text-sm text-slate-300 whitespace-nowrap`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
