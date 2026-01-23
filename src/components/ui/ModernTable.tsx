import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface ModernTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  hover?: boolean;
}

export function ModernTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
  emptyMessage = 'Aucune donnée disponible',
  loading = false,
  striped = true,
  hover = true,
}: ModernTableProps<T>) {
  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-slate-400">Chargement...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8">
        <p className="text-center text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider
                    ${column.sortable && onSort ? 'cursor-pointer select-none hover:bg-slate-800/50' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && onSort && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && onSort && (
                      <span className="text-slate-500">
                        {sortBy === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )
                        ) : (
                          <ChevronsUpDown size={16} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={index}
                className={`
                  border-b border-slate-700/30
                  ${striped && index % 2 === 0 ? 'bg-slate-800/30' : ''}
                  ${hover ? 'hover:bg-slate-700/30 transition-colors' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-slate-300">
                    {column.render ? column.render(item) : String(item[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ModernTableCardProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  columns?: number;
}

export function ModernTableCard<T>({
  data,
  renderCard,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  columns = 3,
}: ModernTableCardProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-slate-400">Chargement...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} gap-6`}>
      {data.map((item, index) => renderCard(item, index))}
    </div>
  );
}
