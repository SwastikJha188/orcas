import React from "react";
import { rowActivate } from "./row-activate";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedId?: string;
  selectedKey?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedId,
  selectedKey,
  className = "",
}: TableProps<T>) {
  const activeSelected = selectedId || selectedKey;
  return (
    <div className={`ui-table-container ${className}`}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} data-col={col.key} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const id = keyExtractor(row);
            const isSelected = id === activeSelected;
            return (
              <tr
                key={id}
                className={[isSelected ? "active" : "", onRowClick ? "is-clickable" : ""].filter(Boolean).join(" ") || undefined}
                {...(onRowClick ? rowActivate(() => onRowClick(row)) : {})}
              >
                {columns.map((col) => (
                  <td key={col.key} data-col={col.key} data-label={col.header || undefined}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
