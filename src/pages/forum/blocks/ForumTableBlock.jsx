import { useMemo, useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/** Sortable, multi-column data table — plain text cells, no HTML, click a header to sort. */
export default function ForumTableBlock({ data }) {
  const { columns = [], rows = [] } = data || {};
  const [sort, setSort] = useState(null); // { index, dir }

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { index, dir } = sort;
    const withNumbers = rows.every((r) => r[index] === '' || !Number.isNaN(Number(r[index])));
    return [...rows].sort((a, b) => {
      const av = a[index] ?? '';
      const bv = b[index] ?? '';
      const cmp = withNumbers ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort]);

  if (!columns.length) return null;

  const toggleSort = (index) => {
    setSort((prev) => {
      if (!prev || prev.index !== index) return { index, dir: 'asc' };
      if (prev.dir === 'asc') return { index, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className="forum-card overflow-x-auto p-0">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-soft bg-surface-soft">
            {columns.map((col, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-bold text-text-primary">
                <button type="button" onClick={() => toggleSort(i)} className="inline-flex items-center gap-1 hover:text-[color:var(--forum-accent)]">
                  {col}
                  {sort?.index === i ? (sort.dir === 'asc' ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />) : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, r) => (
            <tr key={r} className="border-b border-line-soft last:border-0 odd:bg-transparent even:bg-surface-soft/40">
              {columns.map((_, c) => (
                <td key={c} className="whitespace-nowrap px-3 py-2 text-text-primary">{row[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
