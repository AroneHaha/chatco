// components/admin/ui/data-table.tsx
import { ReactNode, useState, useMemo } from 'react';

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
}

export function DataTable<T extends Record<string, any>>({ data, columns, searchQuery }: DataTableProps<T>) {
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/20">
        <thead className="bg-white/5">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-6 py-3 text-xs font-medium text-gray-300 uppercase tracking-wider ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {filteredData.map((item, idx) => (
            <tr key={idx} className="hover:bg-white/5 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-200 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {col.render ? col.render(item[col.key], item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}