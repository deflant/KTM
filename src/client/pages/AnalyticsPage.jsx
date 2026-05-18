import React, { useState, useEffect } from 'react';
import DonutChart from '../components/DonutChart.jsx';
import BarChart from '../components/BarChart.jsx';
import ScorecardTable from '../components/ScorecardTable.jsx';
import KPICard from '../components/KPICard.jsx';
import './AnalyticsPage.css';

var TABLE_API = '/api/now/table';
var STATS_API = '/api/now/stats';

function getHeaders() {
    return { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-UserToken': window.g_ck || '' };
}

function statsGet(table, query, groupBy) {
    var url = new URL(STATS_API + '/' + table, window.location.origin);
    url.searchParams.set('sysparm_count', 'true');
    url.searchParams.set('sysparm_display_value', 'true');
    if (query) url.searchParams.set('sysparm_query', query);
    if (groupBy) url.searchParams.set('sysparm_group_by', groupBy);
    return fetch(url.toString(), { headers: getHeaders() }).then(function (r) { return r.json(); });
}

function tableGet(table, query, fields, limit) {
    var url = new URL(TABLE_API + '/' + table, window.location.origin);
    if (query) url.searchParams.set('sysparm_query', query);
    if (fields) url.searchParams.set('sysparm_fields', fields);
    url.searchParams.set('sysparm_limit', String(limit || 500));
    url.searchParams.set('sysparm_display_value', 'all');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');
    return fetch(url.toString(), { headers: getHeaders() }).then(function (r) { return r.json(); });
}

function parseGroupedStats(data) {
    if (!data || !data.result) return [];
    var arr = Array.isArray(data.result) ? data.result : [data.result];
    return arr.map(function (item) {
        var count = 0;
        if (item.stats && item.stats.count) count = parseInt(item.stats.count) || 0;
        var groupVal = '';
        var groupDisplay = '';
        if (item.groupby_fields && item.groupby_fields.length > 0) {
            groupVal = item.groupby_fields[0].value || '';
            groupDisplay = item.groupby_fields[0].display_value || groupVal;
        }
        return { value: groupVal, display: groupDisplay, count: count };
    }).filter(function (g) { return g.count > 0; });
}

function parseSingleCount(data) {
    if (!data || !data.result) return 0;
    var r = Array.isArray(data.result) ? data.result[0] : data.result;
    return (r && r.stats && r.stats.count) ? parseInt(r.stats.count) || 0 : 0;
}

function dv(f) { return f ? (typeof f === 'string' ? f : f.display_value || f.value || '') : ''; }
function val(f) { return f ? (typeof f === 'string' ? f : f.value || '') : ''; }

var STATE_COLORS = { '1': '#9E9E9E', '2': '#E8A317', '18': '#0080A3', '3': '#00915A', '4': '#E42338', '7': '#BDBDBD' };
var STATE_LABELS = { '1': 'Brouillon', '2': 'Soumise', '3': 'Résolue', '4': 'Rejetée', '7': 'Annulée', '18': 'En cours' };
var TYPE_LABELS = { content_update: 'Mise à jour contenu', factual_correction: 'Correction factuelle', outdated_info: 'Info obsolète', missing_section: 'Section manquante', formatting_issue: 'Formatage', retire_article: 'Retrait' };
var TYPE_COLORS = ['#006742', '#00915A', '#00A86B', '#66CDAA', '#B2DFDB', '#4DB6AC'];
var REVIEWER_COLORS = ['#006742', '#00915A', '#00A86B', '#009688', '#26A69A', '#4DB6AC', '#80CBC4'];
var AGE_COLORS = ['#00915A', '#E8A317', '#FF7043', '#E42338'];

export default function AnalyticsPage({ excludedSources }) {
    var _d = useState(null), data = _d[0], setData = _d[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _e = useState(''), error = _e[0], setError = _e[1];

    useEffect(function () {
        var cancelled = false;
        setLoading(true);
        setError('');

        var AL = 'x_snc_knowledge_tr_article_list';
        var RR = 'x_snc_knowledge_tr_review_record';
        var MR = 'x_snc_knowledge_tr_modification_request';
        var AL_BASE = 'active=true^source_connector_type!=other^source_connector_nameISNOTEMPTY';
        var RR_BASE = 'active=true^source_connector_type!=other^source_connector_nameISNOTEMPTY';
        if (excludedSources && excludedSources.length > 0) {
            var exclFrag = '^source_connector_nameNOT IN' + excludedSources.join(',');
            AL_BASE += exclFrag;
            RR_BASE += exclFrag;
        }

        Promise.all([
            /* 0  */ statsGet(AL, AL_BASE),
            /* 1  */ statsGet(AL, AL_BASE + '^review_record.review_status=approved'),
            /* 2  */ statsGet(AL, AL_BASE + '^review_record.review_status=pending_review'),
            /* 3  */ statsGet(AL, AL_BASE + '^review_record.freshness_score=stale'),
            /* 4  */ statsGet(AL, AL_BASE, 'source_connector_name'),
            /* 5  */ statsGet(AL, AL_BASE + '^review_record.review_status=approved', 'source_connector_name'),
            /* 6  */ statsGet(AL, AL_BASE + '^review_record.freshness_score=stale', 'source_connector_name'),
            /* 7  */ statsGet(MR, '', 'state'),
            /* 8  */ statsGet(MR, '', 'modification_type'),
            /* 9  */ statsGet(MR, 'stateNOT IN3,4,7'),
            /* 10 */ statsGet(RR, RR_BASE + '^assigned_reviewerISNOTEMPTY', 'assigned_reviewer'),
            /* 11 */ statsGet(RR, RR_BASE + '^last_reviewed_byISNOTEMPTY', 'last_reviewed_by'),
            /* 12 */ statsGet(RR, RR_BASE + '^assigned_reviewerISEMPTY'),
            /* 13 */ tableGet(RR, RR_BASE, 'sys_id,days_since_last_review,last_reviewed_on', 1000),
            /* 14 */ statsGet(AL, AL_BASE + '^review_recordISEMPTY'),
        ]).then(function (results) {
            if (cancelled) return;

            var totalArticles = parseSingleCount(results[0]);
            var approvedCount = parseSingleCount(results[1]);
            var pendingCount = parseSingleCount(results[2]);
            var staleCount = parseSingleCount(results[3]);
            var noReviewRecordCount = parseSingleCount(results[14]);
            var openMods = parseSingleCount(results[9]);

            var modByState = parseGroupedStats(results[7]).map(function (s) {
                return { label: STATE_LABELS[s.value] || s.display || s.value, value: s.count, color: STATE_COLORS[s.value] || '#9E9E9E' };
            });
            var modTotal = 0; var modOpen = 0; var modResolved = 0;
            parseGroupedStats(results[7]).forEach(function (s) {
                modTotal += s.count;
                if (s.value === '3') modResolved = s.count;
                if (s.value !== '3' && s.value !== '4' && s.value !== '7') modOpen += s.count;
            });

            var modByType = parseGroupedStats(results[8]).map(function (t, i) {
                return { label: TYPE_LABELS[t.value] || t.display || t.value, value: t.count, color: TYPE_COLORS[i % TYPE_COLORS.length] };
            });

            var sourceTotals = {};
            parseGroupedStats(results[4]).forEach(function (s) {
                sourceTotals[s.value] = { name: s.display || s.value, total: s.count, approved: 0, stale: 0 };
            });
            parseGroupedStats(results[5]).forEach(function (s) {
                if (sourceTotals[s.value]) sourceTotals[s.value].approved = s.count;
            });
            parseGroupedStats(results[6]).forEach(function (s) {
                if (sourceTotals[s.value]) sourceTotals[s.value].stale = s.count;
            });
            var sourceList = Object.values(sourceTotals).map(function (s) {
                return {
                    name: s.name, total: s.total,
                    approved_pct: s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0,
                    stale_pct: s.total > 0 ? Math.round((s.stale / s.total) * 100) : 0,
                    pending: s.total - s.approved,
                };
            });

            var assignedPerReviewer = parseGroupedStats(results[10]).map(function (r, i) {
                return { label: r.display || r.value, value: r.count, color: REVIEWER_COLORS[i % REVIEWER_COLORS.length] };
            }).sort(function (a, b) { return b.value - a.value; }).slice(0, 10);

            var topReviewers = parseGroupedStats(results[11]).map(function (r, i) {
                return { label: r.display || r.value, value: r.count, color: REVIEWER_COLORS[i % REVIEWER_COLORS.length] };
            }).sort(function (a, b) { return b.value - a.value; }).slice(0, 10);

            var unassignedCount = parseSingleCount(results[12]);

            var buckets = { lt30: 0, d30_90: 0, d90_180: 0, gt180: 0 };
            var neverReviewed = noReviewRecordCount;
            var totalDaysSinceReview = 0;
            var reviewedCount = 0;
            var rrRecords = (results[13] && results[13].result) ? results[13].result : [];
            rrRecords.forEach(function (r) {
                var lastReviewed = val(r.last_reviewed_on);
                if (!lastReviewed) { neverReviewed++; return; }
                var days = parseInt(val(r.days_since_last_review)) || 0;
                totalDaysSinceReview += days;
                reviewedCount++;
                if (days < 30) buckets.lt30++;
                else if (days < 90) buckets.d30_90++;
                else if (days < 180) buckets.d90_180++;
                else buckets.gt180++;
            });
            var avgDaysSinceReview = reviewedCount > 0 ? Math.round((totalDaysSinceReview / reviewedCount) * 10) / 10 : null;

            var ageBucketData = [
                { label: '< 30 j', count: buckets.lt30 },
                { label: '30–90 j', count: buckets.d30_90 },
                { label: '90–180 j', count: buckets.d90_180 },
                { label: '> 180 j', count: buckets.gt180 },
            ];

            setData({
                totalArticles: totalArticles, approvedCount: approvedCount,
                approvedPct: totalArticles > 0 ? Math.round((approvedCount / totalArticles) * 100) : 0,
                pendingCount: pendingCount, staleCount: staleCount, openMods: openMods,
                modByState: modByState, modTotal: modTotal, modOpen: modOpen, modResolved: modResolved,
                modByType: modByType, sourceList: sourceList,
                assignedPerReviewer: assignedPerReviewer, topReviewers: topReviewers,
                unassignedCount: unassignedCount, ageBucketData: ageBucketData,
                neverReviewed: neverReviewed, avgDaysSinceReview: avgDaysSinceReview,
            });
            setLoading(false);
        }).catch(function (err) {
            if (!cancelled) { setError('Erreur : ' + (err.message || 'Erreur inconnue')); setLoading(false); }
        });

        return function () { cancelled = true; };
    }, [excludedSources]);

    if (loading) {
        return (<div className="analytics-page"><h1>📊 Knowledge Health Analytics</h1><div className="analytics-loading"><span className="analytics-spinner">⟳</span><p>Chargement des données…</p></div></div>);
    }
    if (error) {
        return (<div className="analytics-page"><h1>📊 Knowledge Health Analytics</h1><div className="analytics-error"><p>{error}</p></div></div>);
    }

    var d = data || {};
    var hasData = (d.totalArticles || 0) > 0 || (d.modTotal || 0) > 0;

    var reviewDonut = [
        { label: 'Approuvés', value: d.approvedCount || 0, color: '#00915A' },
        { label: 'En attente', value: d.pendingCount || 0, color: '#E8A317' },
        { label: 'Obsolètes', value: d.staleCount || 0, color: '#9E9E9E' },
    ];
    var sourceBarData = (d.sourceList || []).map(function (s) { return { label: s.name, value: s.total, color: '#00915A' }; });
    var ageBarData = (d.ageBucketData || []).map(function (b, i) { return { label: b.label, value: b.count, color: AGE_COLORS[i] }; });

    return (
        <div className="analytics-page">
            <h1>📊 Knowledge Health Analytics</h1>
            {!hasData ? (
                <div className="analytics-empty"><p>Aucune donnée disponible.</p></div>
            ) : (
                <React.Fragment>
                    <section className="an-section">
                        <h2 className="an-section__title">🎯 Indicateurs clés</h2>
                        <div className="an-kpi-row">
                            <KPICard icon="📚" label="Articles total" value={d.totalArticles || 0} accent="green" />
                            <KPICard icon="✅" label="Taux d'approbation" value={(d.approvedPct || 0) + '%'} accent="green" />
                            <KPICard icon="⚠️" label="Articles obsolètes" value={d.staleCount || 0} accent={d.staleCount > 0 ? 'warning' : 'green'} />
                            <KPICard icon="✏️" label="Demandes ouvertes" value={d.openMods || 0} accent={d.openMods > 0 ? 'warning' : 'green'} />
                        </div>
                        <div className="an-kpi-row">
                            <KPICard icon="📅" label="Jours moy. depuis revue" value={d.avgDaysSinceReview !== null ? d.avgDaysSinceReview + ' j' : '—'} accent={d.avgDaysSinceReview > 90 ? 'warning' : 'green'} />
                            <KPICard icon="🚫" label="Jamais révisés" value={d.neverReviewed || 0} accent={d.neverReviewed > 0 ? 'error' : 'green'} />
                            <KPICard icon="👤" label="Sans réviseur" value={d.unassignedCount || 0} accent={d.unassignedCount > 0 ? 'error' : 'green'} />
                        </div>
                    </section>

                    <section className="an-section">
                        <h2 className="an-section__title">📋 Couverture des revues</h2>
                        <div className="an-grid-2">
                            <div className="an-card"><DonutChart data={reviewDonut} title="Statut des revues" size={200} /></div>
                            <div className="an-card">{sourceBarData.length > 0 ? (<BarChart data={sourceBarData} title="Articles par source" horizontal={true} />) : (<div className="an-card__empty"><p>Aucune source disponible</p></div>)}</div>
                        </div>
                        {d.sourceList && d.sourceList.length > 0 && (<div className="an-card an-card--full"><ScorecardTable data={d.sourceList} title="Scorecard santé par source" /></div>)}
                    </section>

                    <section className="an-section">
                        <h2 className="an-section__title">✏️ Demandes de modification</h2>
                        <div className="an-grid-2">
                            <div className="an-card">{d.modByState && d.modByState.length > 0 ? (<DonutChart data={d.modByState} title="Par état" size={200} />) : (<div className="an-card__empty"><p>Aucune demande</p></div>)}</div>
                            <div className="an-card">{d.modByType && d.modByType.length > 0 ? (<BarChart data={d.modByType} title="Par type" horizontal={true} />) : (<div className="an-card__empty"><p>Aucune demande</p></div>)}</div>
                        </div>
                        {d.modTotal > 0 && (<div className="an-summary-row"><div className="an-summary-item"><span className="an-summary-item__value">{d.modTotal}</span><span className="an-summary-item__label">Total</span></div><div className="an-summary-item an-summary-item--open"><span className="an-summary-item__value">{d.modOpen}</span><span className="an-summary-item__label">Ouvertes</span></div><div className="an-summary-item an-summary-item--resolved"><span className="an-summary-item__value">{d.modResolved}</span><span className="an-summary-item__label">Résolues</span></div></div>)}
                    </section>

                    <section className="an-section">
                        <h2 className="an-section__title">👥 Performance des réviseurs</h2>
                        <div className="an-grid-2">
                            <div className="an-card">{d.assignedPerReviewer && d.assignedPerReviewer.length > 0 ? (<BarChart data={d.assignedPerReviewer} title="Articles assignés par réviseur" horizontal={true} />) : (<div className="an-card__empty"><p>Aucun réviseur assigné</p></div>)}</div>
                            <div className="an-card">{d.topReviewers && d.topReviewers.length > 0 ? (<BarChart data={d.topReviewers} title="Top réviseurs (revues effectuées)" horizontal={true} />) : (<div className="an-card__empty"><p>Aucune revue effectuée</p></div>)}</div>
                        </div>
                    </section>

                    <section className="an-section">
                        <h2 className="an-section__title">🕐 Fraîcheur & ancienneté</h2>
                        <div className="an-grid-2">
                            <div className="an-card">{ageBarData.some(function (b) { return b.value > 0; }) ? (<BarChart data={ageBarData} title="Ancienneté depuis dernière revue" horizontal={false} height={220} />) : (<div className="an-card__empty"><p>Aucune donnée</p></div>)}</div>
                            <div className="an-card">
                                <h3 className="an-card__title">Résumé de la fraîcheur</h3>
                                <div className="an-freshness-summary">
                                    <div className="an-freshness-item"><span className="an-freshness-item__value an-freshness-item__value--good">{d.ageBucketData && d.ageBucketData[0] ? d.ageBucketData[0].count : 0}</span><span className="an-freshness-item__label">{'< 30 jours'}</span></div>
                                    <div className="an-freshness-item"><span className="an-freshness-item__value an-freshness-item__value--warn">{d.ageBucketData && d.ageBucketData[1] ? d.ageBucketData[1].count : 0}</span><span className="an-freshness-item__label">30–90 jours</span></div>
                                    <div className="an-freshness-item"><span className="an-freshness-item__value an-freshness-item__value--bad">{(d.ageBucketData && d.ageBucketData[2] ? d.ageBucketData[2].count : 0) + (d.ageBucketData && d.ageBucketData[3] ? d.ageBucketData[3].count : 0)}</span><span className="an-freshness-item__label">{'> 90 jours'}</span></div>
                                    <div className="an-freshness-item"><span className="an-freshness-item__value an-freshness-item__value--none">{d.neverReviewed || 0}</span><span className="an-freshness-item__label">Jamais révisés</span></div>
                                </div>
                            </div>
                        </div>
                    </section>
                </React.Fragment>
            )}
        </div>
    );
}
