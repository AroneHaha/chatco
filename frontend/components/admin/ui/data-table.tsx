// components/admin/ui/data-table.tsx
import { ReactNode, useMemo } from 'react';

interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchQuery: string;
  emptyMessage?: string;
  onRowDoubleClick?: (item: T) => void;
  /**
   * Caps the table's height and scrolls the body instead of growing the page.
   * Any CSS length, e.g. "60vh". Omit for the default auto-height behaviour.
   */
  maxHeight?: string;
  /** Keeps the header row visible while the body scrolls. Needs `maxHeight`. */
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchQuery,
  emptyMessage = 'No data found.',
  onRowDoubleClick,
  maxHeight,
  stickyHeader = false,
}: DataTableProps<T>) {
  const filteredData = useMemo(() => {
    if (!searchQuery) {
      return data;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    return data.filter((item) => {
      return Object.values(item).some((value) =>
        String(value).toLowerCase().includes(lowerCaseQuery)
      );
    });
  }, [data, searchQuery]);

  return (
    <div className="overflow-x-auto scrollbar-themed" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      {filteredData.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[#1E2D45]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  } ${
                    // The <tr> border doesn't travel with sticky cells, so the
                    // divider is redrawn as an inset shadow on each header cell.
                    stickyHeader ? 'sticky top-0 z-10 bg-[#0B1220] shadow-[inset_0_-1px_0_#1E2D45]' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2540]">
            {filteredData.map((item, idx) => (
              <tr
                key={idx}
                className={`hover:bg-[#162033] transition-colors ${onRowDoubleClick ? 'cursor-pointer' : ''}`}
                onDoubleClick={() => onRowDoubleClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-300 ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}