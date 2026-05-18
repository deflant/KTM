import React from 'react';
import './FilterBar.css';

export default function FilterBar({ filters, activeFilters, onFilterChange, dropdowns }) {
    return (
        <section className="filter-bar" aria-label="Filters">
            <div className="filter-pills">
                {(filters || []).map(function (f) {
                    var isActive = activeFilters && activeFilters[f.key] === f.value;
                    return (
                        <button key={f.key + '_' + f.value}
                            className={'filter-pill ' + (isActive ? 'filter-pill--active' : '')}
                            onClick={function () { onFilterChange(f.key, isActive ? '' : f.value); }}>
                            {f.label}
                        </button>
                    );
                })}
            </div>
            {dropdowns && (
                <div className="filter-dropdowns">
                    {dropdowns.map(function (dd) {
                        return (
                            <label key={dd.key} className="filter-dropdown">
                                <span className="filter-dropdown__label">{dd.label}</span>
                                <select value={activeFilters[dd.key] || ''} onChange={function (e) { onFilterChange(dd.key, e.target.value); }}>
                                    <option value="">All</option>
                                    {(dd.options || []).map(function (opt) {
                                        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                                    })}
                                </select>
                            </label>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
