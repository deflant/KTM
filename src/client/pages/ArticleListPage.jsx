import React, { useState, useEffect, useRef, useCallback } from 'react';
import useArticleList from '../hooks/useArticleList.js';
import { ensureReviewRecord, fetchDistinctSources } from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import StatusPill from '../components/StatusPill.jsx';
import './ArticleListPage.css';

var TYPE_ICONS = {
    confluence: '🔗', sharepoint: '📁', web_crawler: '🌐',
    google_drive: '📄', servicenow_kb: '📚', servicenow_docs: '📖',
};

var STATUS_OPTIONS = [
    { value: 'pending_review', label: 'En attente', icon: '⏳' },
    { value: 'in_review', label: 'En revue', icon: '🔍' },
    { value: 'approved', label: 'Approuvé', icon: '✅' },
    { value: 'modification_requested', label: 'Modification', icon: '📝' },
    { value: 're_review_needed', label: 'Re-revue', icon: '🔄' },
];

var FRESHNESS_OPTIONS = [
    { value: 'fresh', label: 'Frais', icon: '🟢' },
    { value: 'aging', label: 'Vieillissant', icon: '🟡' },
    { value: 'stale', label: 'Obsolète', icon: '🔴' },
];

var COLUMNS = [
    {
        key: 'article_title',
        label: 'Nom du document',
        render: function (v) {
            var title = v || '(Sans titre)';
            title = title.replace(/<\/?highlight>/g, '');
            return title;
        },
    },
    {
        key: 'source_connector_name',
        label: 'Source',
        render: function (v, row) {
            var icon = TYPE_ICONS[row.source_connector_type] || '📂';
            return React.createElement('span', { className: 'al-source-cell' },
                React.createElement('span', { className: 'al-source-cell__icon' }, icon),
                v || '—'
            );
        },
    },
    {
        key: 'review_status',
        label: 'Statut',
        render: function (v) {
            return React.createElement(StatusPill, { status: v || 'pending_review' });
        },
    },
    {
        key: 'freshness_score',
        label: 'Fraîcheur',
        render: function (v) {
            return React.createElement(StatusPill, { status: v || 'fresh' });
        },
    },
    {
        key: 'assigned_reviewer',
        label: 'Assigné à',
        render: function (v) {
            return v || React.createElement('span', { style: { color: '#999', fontStyle: 'italic' } }, 'Non assigné');
        },
    },
];

export default function ArticleListPage({ onNavigate, excludedSources }) {
    var al = useArticleList(excludedSources);

    // Dynamic sources
    var _sources = useState([]), sources = _sources[0], setSources = _sources[1];
    var _sourcesLoading = useState(true), sourcesLoading = _sourcesLoading[0], setSourcesLoading = _sourcesLoading[1];

    // Search with debounce
    var _searchInput = useState(''), searchInput = _searchInput[0], setSearchInput = _searchInput[1];
    var debounceRef = useRef(null);

    // Load distinct sources on mount
    useEffect(function () {
        setSourcesLoading(true);
        fetchDistinctSources(excludedSources).then(function (res) {
            setSources(res || []);
            setSourcesLoading(false);
        }).catch(function () { setSourcesLoading(false); });
    }, [excludedSources]);

    // Debounced search
    var handleSearchChange = useCallback(function (e) {
        var val = e.target.value;
        setSearchInput(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(function () {
            al.updateFilter('search', val || '');
        }, 400);
    }, [al.updateFilter]);

    function toggleFilter(key, value) {
        var current = al.filters[key] || '';
        al.updateFilter(key, current === value ? '' : value);
    }

    function clearAllFilters() {
        setSearchInput('');
        al.clearFilters();
    }

    var activeFilterCount = Object.keys(al.filters).filter(function (k) {
        return al.filters[k] && al.filters[k] !== '';
    }).length;

    return (
        <div className="article-list-page">
            {/* Header */}
            <section className="al-header">
                <div className="al-header__left">
                    <h2 className="al-header__title">📋 Liste des articles</h2>
                    <span className="al-header__count">
                        {al.total} article{al.total !== 1 ? 's' : ''}
                    </span>
                </div>
            </section>

            {/* Filter bar */}
            <section className="al-filters" aria-label="Filtres">
                {/* Search */}
                <div className="al-filters__search">
                    <span className="al-filters__search-icon">🔍</span>
                    <input
                        type="text"
                        className="al-filters__search-input"
                        placeholder="Rechercher par titre…"
                        value={searchInput}
                        onChange={handleSearchChange}
                        aria-label="Rechercher des articles"
                    />
                    {searchInput && (
                        <button className="al-filters__search-clear" onClick={function () { setSearchInput(''); al.updateFilter('search', ''); }} aria-label="Effacer la recherche">✕</button>
                    )}
                </div>

                {/* Source pills */}
                <div className="al-filters__group">
                    <span className="al-filters__group-label">Source</span>
                    <div className="al-filters__pills">
                        {sourcesLoading ? (
                            <span className="al-filters__loading">Chargement…</span>
                        ) : sources.length === 0 ? (
                            <span className="al-filters__empty">Aucune source</span>
                        ) : sources.map(function (src) {
                            var isActive = al.filters.source === src.name;
                            var icon = TYPE_ICONS[src.type] || '📂';
                            return (
                                <button
                                    key={src.name}
                                    className={'al-pill al-pill--source' + (isActive ? ' al-pill--active' : '')}
                                    onClick={function () { toggleFilter('source', src.name); }}
                                    title={src.name + ' (' + src.count + ' articles)'}
                                >
                                    <span className="al-pill__icon">{icon}</span>
                                    <span className="al-pill__label">{src.name}</span>
                                    <span className="al-pill__count">{src.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status pills */}
                <div className="al-filters__group">
                    <span className="al-filters__group-label">Statut</span>
                    <div className="al-filters__pills">
                        {STATUS_OPTIONS.map(function (opt) {
                            var isActive = al.filters.status === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    className={'al-pill al-pill--status' + (isActive ? ' al-pill--active' : '')}
                                    onClick={function () { toggleFilter('status', opt.value); }}
                                >
                                    <span className="al-pill__icon">{opt.icon}</span>
                                    <span className="al-pill__label">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Freshness pills */}
                <div className="al-filters__group">
                    <span className="al-filters__group-label">Fraîcheur</span>
                    <div className="al-filters__pills">
                        {FRESHNESS_OPTIONS.map(function (opt) {
                            var isActive = al.filters.freshness === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    className={'al-pill al-pill--freshness' + (isActive ? ' al-pill--active' : '')}
                                    onClick={function () { toggleFilter('freshness', opt.value); }}
                                >
                                    <span className="al-pill__icon">{opt.icon}</span>
                                    <span className="al-pill__label">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active filter summary + clear */}
                {activeFilterCount > 0 && (
                    <div className="al-filters__active-bar">
                        <span className="al-filters__active-count">
                            {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
                        </span>
                        <button className="al-filters__clear-btn" onClick={clearAllFilters}>
                            ✕ Réinitialiser
                        </button>
                    </div>
                )}
            </section>

            {/* Data table or states */}
            {al.loading && al.records.length === 0 ? (
                <div className="article-list-page__loading">
                    <span className="article-list-page__spinner">⟳</span>
                    <p>Chargement des articles…</p>
                </div>
            ) : al.records.length === 0 ? (
                <div className="article-list-page__empty">
                    <div className="article-list-page__empty-icon">
                        {activeFilterCount > 0 ? '🔍' : '📋'}
                    </div>
                    <h3>{activeFilterCount > 0 ? 'Aucun résultat' : 'Aucun article synchronisé'}</h3>
                    <p>
                        {activeFilterCount > 0
                            ? 'Aucun article ne correspond aux filtres sélectionnés. Essayez de modifier ou réinitialiser les filtres.'
                            : 'Allez dans ⚙️ Configuration > Synchronisation pour importer les articles ServiceNow KB et les documents des connecteurs externes.'
                        }
                    </p>
                    {activeFilterCount > 0 && (
                        <button className="al-empty__clear-btn" onClick={clearAllFilters}>
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={COLUMNS}
                    rows={al.records}
                    onRowClick={function (row) {
                        if (row.review_record) {
                            onNavigate('detail', row.review_record);
                        } else {
                            ensureReviewRecord(row).then(function (rrId) {
                                if (rrId) onNavigate('detail', rrId);
                            });
                        }
                    }}
                    currentPage={al.page}
                    totalPages={al.totalPages}
                    onPageChange={al.setPage}
                />
            )}
        </div>
    );
}
