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
  density?: 'default' | 'compact';
  /** Show the same columns as readable cards below the desktop breakpoint. */
  mobileCards?: boolean;
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
  density = 'default',
  mobileCards = false,
}: DataTableProps<T>) {
  const tableHeight = height ?? maxHeight ?? '32rem';
  const isCompact = density === 'compact';
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
  const cardHeading = columns[0];
  const cardActions = columns.find((column) => column.key === 'actions');
  const cardDetails = columns.filter((column) => column !== cardHeading && column !== cardActions);
  const renderValue = (column: Column<T>, item: T) => {
    const value = (item as Record<string, unknown>)[column.key];
    return column.render ? column.render(value as never, item) : (value as ReactNode);
  };

  return (
    <div
      className={`flex w-full flex-col overflow-hidden rounded-lg border border-[#23344F] bg-[#0E1628] ${
        allowHorizontalScroll ? (mobileCards ? 'overflow-x-hidden md:overflow-x-auto' : 'overflow-x-auto') : 'overflow-x-hidden'
      } scrollbar-themed`}
      style={{ height: tableHeight }}
    >
      {filteredData.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {mobileCards && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-themed md:hidden">
              {filteredData.map((item, idx) => (
                <article
                  key={String((item as Record<string, unknown>).id ?? idx)}
                  onDoubleClick={() => onRowDoubleClick?.(item)}
                  className="min-w-0 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 break-words [&_.whitespace-nowrap]:whitespace-normal"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">{cardHeading && renderValue(cardHeading, item)}</div>
                    {cardActions && <div className="shrink-0 [&_button]:min-h-11 [&_button]:min-w-11">{renderValue(cardActions, item)}</div>}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#1E2D45] pt-3">
                    {cardDetails.map((column) => (
                      <div key={column.key} className={`min-w-0 ${column.key === 'rejectionReason' ? 'col-span-2' : ''}`}>
                        <dt className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">{column.label}</dt>
                        <dd className="min-w-0 text-sm text-slate-300">{renderValue(column, item)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          )}
          <div className={`${mobileCards ? 'hidden md:block' : ''} min-h-0 flex-1 overflow-y-auto scrollbar-themed`}>
          <table className={`${allowHorizontalScroll ? 'min-w-full' : 'w-full'} ${tableClassName}`}>
            <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
              <tr className="border-b border-[#1E2D45]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 ${isCompact ? 'py-2' : 'py-3'} text-xs font-medium text-slate-400 uppercase tracking-wider ${
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
                  className={`${isCompact ? 'h-9' : 'h-12'} hover:bg-[#172238] transition-colors ${onRowDoubleClick ? 'cursor-pointer' : ''}`}
                  onDoubleClick={() => onRowDoubleClick?.(item)}
                >
                  {columns.map((col) => {
                    const value = (item as Record<string, unknown>)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`min-w-0 px-4 ${isCompact ? 'py-1.5' : 'py-3'} text-sm text-slate-300 ${
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
        </>
      )}
    </div>
  );
}
