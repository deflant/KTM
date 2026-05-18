import React from 'react';
import useKPIData from '../hooks/useKPIData.js';
import useArticleList from '../hooks/useArticleList.js';
import { ensureReviewRecord } from '../services/api.js';
import KPICard from '../components/KPICard.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusPill from '../components/StatusPill.jsx';
import './HomePage.css';

var COLUMNS = [
    {
        key: 'article_title', label: 'Nom du document',
        render: function (v) { return (v || '—').replace(/<\/?highlight>/g, ''); },
    },
    { key: 'source_connector_name', label: 'Source' },
    {
        key: 'review_status', label: 'Statut',
        render: function (v) { return React.createElement(StatusPill, { status: v || 'pending_review' }); },
    },
    {
        key: 'freshness_score', label: 'Fraîcheur',
        render: function (v) { return React.createElement(StatusPill, { status: v || 'fresh' }); },
    },
    {
        key: 'assigned_reviewer', label: 'Assigné à',
        render: function (v) { return v || React.createElement('span', { style: { color: '#999', fontStyle: 'italic' } }, 'Non assigné'); },
    },
];

export default function HomePage({ onNavigate, excludedSources }) {
    var kpi = useKPIData(excludedSources);
    var al = useArticleList(excludedSources);

    var kpiData = kpi.data || {};
    var totalArticles = kpiData.total_articles || 0;
    var approvedPct = kpiData.approved_pct || 0;
    var stalePct = kpiData.stale_pct || 0;

    return (
        <div className="home-page">
            <section className="home-header-row">
                <h2 className="home-header-row__title">Dashboard</h2>
            </section>

            <section className="kpi-row" aria-label="Key Performance Indicators">
                <KPICard icon="📄" label="Total Articles" value={totalArticles} accentClass="accent-green" />
                <KPICard icon="✅" label="% Approuvés" value={approvedPct + '%'} accentClass={approvedPct >= 80 ? 'accent-green' : approvedPct >= 50 ? 'accent-warning' : 'accent-error'} />
                <KPICard icon="⏰" label="% Obsolètes" value={stalePct + '%'} accentClass={stalePct <= 10 ? 'accent-green' : stalePct <= 20 ? 'accent-warning' : 'accent-error'} />
                <KPICard icon="✏️" label="Demandes ouvertes" value={kpiData.open_modification_requests || 0} />
                <KPICard icon="⏱" label="En attente de revue" value={kpiData.pending_count || 0} />
            </section>

            <section className="home-main-grid">
                <div className="home-main-grid__table">
                    <h2>Articles récents</h2>
                    {al.loading && al.records.length === 0 ? (
                        <div className="home-loading">Chargement…</div>
                    ) : al.records.length === 0 ? (
                        <div className="home-empty-state">
                            <div className="home-empty-state__icon">📋</div>
                            <h3>Aucun article</h3>
                            <p>Rendez-vous dans <strong>Liste des articles</strong> pour synchroniser les documents externes.</p>
                            <button className="home-empty-state__btn" onClick={function () { onNavigate('article-list'); }}>
                                📋 Aller à la liste des articles
                            </button>
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
            </section>
        </div>
    );
}
