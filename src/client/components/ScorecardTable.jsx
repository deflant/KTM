import React from 'react';
import './ScorecardTable.css';

function cellClass(value, thresholds) {
    if (value >= thresholds.good) return 'cell--good';
    if (value >= thresholds.warn) return 'cell--warn';
    return 'cell--bad';
}

export default function ScorecardTable({ data, title }) {
    return (
        <figure className="scorecard">
            {title && <figcaption className="scorecard__title">{title}</figcaption>}
            <table className="scorecard__table">
                <thead>
                    <tr>
                        <th>Connector</th>
                        <th>Total</th>
                        <th>% Approved</th>
                        <th>% Stale</th>
                        <th>Pending</th>
                    </tr>
                </thead>
                <tbody>
                    {(data || []).map(function (row, i) {
                        return (
                            <tr key={i}>
                                <td className="scorecard__name">{row.name}</td>
                                <td>{row.total}</td>
                                <td className={cellClass(row.approved_pct, { good: 80, warn: 50 })}>{row.approved_pct}%</td>
                                <td className={cellClass(100 - row.stale_pct, { good: 90, warn: 80 })}>{row.stale_pct}%</td>
                                <td>{row.pending}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </figure>
    );
}
