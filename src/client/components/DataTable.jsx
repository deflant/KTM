import React, { useState } from 'react';
import './DataTable.css';

export default function DataTable({ columns, rows, onRowClick, pageSize, currentPage, totalPages, onPageChange }) {
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    function handleSort(colKey) {
        if (sortCol === colKey) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(colKey);
            setSortDir('asc');
        }
    }

    var displayRows = Array.isArray(rows) ? rows : [];
    if (sortCol && displayRows.length > 0) {
        displayRows = displayRows.slice().sort(function (a, b) {
            var aVal = a[sortCol] || '';
            var bVal = b[sortCol] || '';
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return (
        <div className="data-table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        {(columns || []).map(function (col) {
                            return (
                                <th key={col.key} onClick={function () { handleSort(col.key); }} className={sortCol === col.key ? 'sorted' : ''}>
                                    {col.label}
                                    {sortCol === col.key && <span className="sort-icon">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {displayRows.length === 0 && (
                        <tr><td colSpan={columns ? columns.length : 1} className="no-data">No records found</td></tr>
                    )}
                    {displayRows.map(function (row, idx) {
                        return (
                            <tr key={row.sys_id || idx} onClick={function () { onRowClick && onRowClick(row); }} className={onRowClick ? 'clickable' : ''}>
                                {(columns || []).map(function (col) {
                                    return <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>;
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {totalPages > 1 && (
                <nav className="data-table-pagination" aria-label="Table pagination">
                    <button disabled={currentPage <= 1} onClick={function () { onPageChange && onPageChange(currentPage - 1); }}>← Prev</button>
                    <span className="page-info">Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={function () { onPageChange && onPageChange(currentPage + 1); }}>Next →</button>
                </nav>
            )}
        </div>
    );
}
