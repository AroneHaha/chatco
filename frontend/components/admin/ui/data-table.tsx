// components/admin/ui/data-table.tsx
import { ReactNode, useMemo } from 'react';

interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: never, item: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchQuery: string;
  emptyMessage?: string;
  onRowDoubleClick?: (item: T) => void;
  /** Fixed table viewport height. Records never increase the card height. */
  height?: string;
  /** @deprecated Use `height`. Kept so older callers remain compatible. */
  maxHeight?: string;
  /** Keeps the header row visible while the body scrolls. Needs `maxHeight`. */
  stickyHeader?: boolean;
  /** Disable horizontal overflow for compact, screen-fitting tables. */
  allowHorizontalScroll?: boolean;
  tableClassName?: string;
}

export function DataTable<T extends object>({
  data,
  columns,
  searchQuery,
  emptyMessage = 'No data found.',
  onRowDoubleClick,
  height,
  maxHeight,
  stickyHeader = false,
  allowHorizontalScroll = true,
  tableClassName = '',
}: DataTableProps<T>) {
  const tableHeight = height ?? maxHeight ?? '32rem';
  const filteredData = useMemo(() => {
    if (!searchQuery) {
      return data;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    return data.filter((item) => {
      return Object.values(item as Record<string, unknown>).some((value) =>
        String(value).toLowerCase().includes(lowerCaseQuery)
      );
    });
  }, [data, searchQuery]);

  return (
    <div
      className={`flex w-full flex-col overflow-hidden rounded-lg border border-[#23344F] bg-[#0E1628] ${
        allowHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden'
      } scrollbar-themed`}
      style={{ height: tableHeight }}
    >
      {filteredData.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-themed">
        <table className={`${allowHorizontalScroll ? 'min-w-full' : 'w-full'} ${tableClassName}`}>
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
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
                    stickyHeader ? 'bg-[#111A2B] shadow-[inset_0_-1px_0_#23344F]' : 'bg-[#111A2B]'
                  } ${col.headerClassName ?? ''}`}
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
                className={`h-12 hover:bg-[#172238] transition-colors ${onRowDoubleClick ? 'cursor-pointer' : ''}`}
                onDoubleClick={() => onRowDoubleClick?.(item)}
              >
                {columns.map((col) => {
                  const value = (item as Record<string, unknown>)[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`min-w-0 px-4 py-3 text-sm text-slate-300 ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.cellClassName ?? ''}`}
                    >
                      {col.render ? col.render(value as never, item) : (value as ReactNode)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
