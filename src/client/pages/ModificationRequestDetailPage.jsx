import React, { useState, useEffect } from 'react';
import StatusPill from '../components/StatusPill.jsx';
import ModificationModal from '../components/ModificationModal.jsx';
import { updateModificationRequest, createModificationRequest } from '../services/api.js';
import './ModificationRequestDetailPage.css';

var TABLE_API = '/api/now/table';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserToken': window.g_ck || '',
    };
}

var STATE_MAP = { '1': 'draft', '2': 'submitted', '3': 'resolved', '4': 'rejected', '7': 'cancelled', '18': 'in_progress' };
var STATE_LABELS = { '1': 'Brouillon', '2': 'Soumise', '3': 'Résolue', '4': 'Rejetée', '7': 'Annulée', '18': 'En cours' };
var TYPE_LABELS = {
    content_update: 'Mise à jour du contenu',
    factual_correction: 'Correction factuelle',
    outdated_info: 'Information obsolète',
    missing_section: 'Section manquante',
    formatting_issue: 'Problème de formatage',
    retire_article: 'Retrait de l\'article',
};
var PRIORITY_LABELS = { '1': '1 - Critique', '2': '2 - Haute', '3': '3 - Modérée', '4': '4 - Basse', '5': '5 - Planification' };
var CLOSED_STATES = ['3', '4', '7'];

function dv(f) { return f ? (typeof f === 'string' ? f : f.display_value || f.value || '') : ''; }
function val(f) { return f ? (typeof f === 'string' ? f : f.value || '') : ''; }

export default function ModificationRequestDetailPage({ id, onNavigate }) {
    var _d = useState(null), detail = _d[0], setDetail = _d[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _e = useState(''), error = _e[0], setError = _e[1];
    var _rr = useState(null), reviewRecord = _rr[0], setReviewRecord = _rr[1];

    // Action state
    var _saving = useState(false), saving = _saving[0], setSaving = _saving[1];
    var _actionMsg = useState(null), actionMsg = _actionMsg[0], setActionMsg = _actionMsg[1];

    // Validate modal
    var _showValidate = useState(false), showValidate = _showValidate[0], setShowValidate = _showValidate[1];
    var _resolutionSummary = useState(''), resolutionSummary = _resolutionSummary[0], setResolutionSummary = _resolutionSummary[1];

    // Reject modal
    var _showReject = useState(false), showReject = _showReject[0], setShowReject = _showReject[1];
    var _rejectReason = useState(''), rejectReason = _rejectReason[0], setRejectReason = _rejectReason[1];

    // Complementary request modal
    var _showCompModal = useState(false), showCompModal = _showCompModal[0], setShowCompModal = _showCompModal[1];

    function loadDetail() {
        if (!id) return;
        setLoading(true);
        setError('');

        var url = new URL(TABLE_API + '/x_snc_knowledge_tr_modification_request/' + id, window.location.origin);
        url.searchParams.set('sysparm_display_value', 'all');
        url.searchParams.set('sysparm_exclude_reference_link', 'true');

        fetch(url.toString(), { headers: getHeaders() })
            .then(function (resp) {
                if (!resp.ok) throw new Error('Erreur API: ' + resp.status);
                return resp.json();
            })
            .then(function (data) {
                var r = (data && data.result) ? data.result : null;
                if (!r) throw new Error('Demande non trouvée');

                var mapped = {
                    sys_id: val(r.sys_id),
                    number: val(r.number),
                    short_description: val(r.short_description),
                    description: val(r.description),
                    modification_type: val(r.modification_type),
                    state: val(r.state),
                    priority: val(r.priority),
                    assigned_to: dv(r.assigned_to),
                    assigned_to_id: val(r.assigned_to),
                    requested_by_reviewer: dv(r.requested_by_reviewer),
                    requested_by_reviewer_id: val(r.requested_by_reviewer),
                    review_record: val(r.review_record),
                    review_record_display: dv(r.review_record),
                    target_resolution_date: val(r.target_resolution_date),
                    opened_at: val(r.opened_at),
                    closed_at: val(r.closed_at),
                    close_notes: val(r.close_notes),
                    resolution_summary: val(r.resolution_summary),
                    sys_created_on: val(r.sys_created_on),
                    sys_updated_on: val(r.sys_updated_on),
                    assignment_group: dv(r.assignment_group),
                    urgency: val(r.urgency),
                    impact: val(r.impact),
                };
                setDetail(mapped);

                if (mapped.review_record) {
                    var rrUrl = new URL(TABLE_API + '/x_snc_knowledge_tr_review_record/' + mapped.review_record, window.location.origin);
                    rrUrl.searchParams.set('sysparm_display_value', 'all');
                    rrUrl.searchParams.set('sysparm_fields', 'sys_id,display_title,external_doc_title,review_status,freshness_score,source_connector_name,assigned_reviewer');
                    rrUrl.searchParams.set('sysparm_exclude_reference_link', 'true');
                    return fetch(rrUrl.toString(), { headers: getHeaders() });
                }
                return null;
            })
            .then(function (resp) {
                if (!resp) { setLoading(false); return; }
                if (!resp.ok) { setLoading(false); return; }
                return resp.json();
            })
            .then(function (data) {
                if (data && data.result) {
                    var rr = data.result;
                    setReviewRecord({
                        sys_id: val(rr.sys_id),
                        display_title: val(rr.display_title) || val(rr.external_doc_title) || 'Sans titre',
                        review_status: val(rr.review_status),
                        freshness_score: val(rr.freshness_score),
                        source_connector_name: val(rr.source_connector_name),
                        assigned_reviewer: dv(rr.assigned_reviewer),
                    });
                }
                setLoading(false);
            })
            .catch(function (err) {
                setError(err.message || 'Erreur inconnue');
                setLoading(false);
            });
    }

    useEffect(function () { loadDetail(); }, [id]);

    // ── Actions ──

    function handleValidate(e) {
        e.preventDefault();
        if (!resolutionSummary.trim()) return;
        setSaving(true);
        setActionMsg(null);
        updateModificationRequest(id, {
            state: '3',
            resolution_summary: resolutionSummary.trim(),
        }).then(function () {
            setSaving(false);
            setShowValidate(false);
            setResolutionSummary('');
            setActionMsg({ type: 'success', text: '✅ La demande a été validée et résolue.' });
            loadDetail();
        }).catch(function (err) {
            setSaving(false);
            setActionMsg({ type: 'error', text: '❌ Erreur : ' + (err.message || 'Échec de la validation') });
        });
    }

    function handleReject(e) {
        e.preventDefault();
        if (!rejectReason.trim()) return;
        setSaving(true);
        setActionMsg(null);
        updateModificationRequest(id, {
            state: '4',
            close_notes: rejectReason.trim(),
        }).then(function () {
            setSaving(false);
            setShowReject(false);
            setRejectReason('');
            setActionMsg({ type: 'success', text: '🚫 La demande a été rejetée.' });
            loadDetail();
        }).catch(function (err) {
            setSaving(false);
            setActionMsg({ type: 'error', text: '❌ Erreur : ' + (err.message || 'Échec du rejet') });
        });
    }

    function handleComplementarySubmit(data) {
        setSaving(true);
        setActionMsg(null);
        createModificationRequest(data).then(function (res) {
            setSaving(false);
            setShowCompModal(false);
            var newNumber = (res && res.result && res.result.number) ? res.result.number : '';
            setActionMsg({ type: 'success', text: '📝 Demande complémentaire créée' + (newNumber ? ' (' + newNumber + ')' : '') + '.' });
        }).catch(function (err) {
            setSaving(false);
            setActionMsg({ type: 'error', text: '❌ Erreur : ' + (err.message || 'Échec de la création') });
        });
    }

    if (loading) {
        return (
            <div className="mrd-loading">
                <span className="mrd-spinner">⟳</span>
                <p>Chargement de la demande…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mrd-page">
                <nav className="breadcrumb" aria-label="Breadcrumb">
                    <button className="breadcrumb__link" onClick={function () { onNavigate('modifications'); }}>Demandes de modification</button>
                    <span className="breadcrumb__sep">›</span>
                    <span className="breadcrumb__current">Erreur</span>
                </nav>
                <div className="mrd-error">{error}</div>
            </div>
        );
    }

    if (!detail) return null;

    var d = detail;
    var stateKey = STATE_MAP[d.state] || d.state;
    var stateLabel = STATE_LABELS[d.state] || d.state;
    var typeLabel = TYPE_LABELS[d.modification_type] || d.modification_type || '—';
    var priorityLabel = PRIORITY_LABELS[d.priority] || d.priority || '—';
    var isClosed = CLOSED_STATES.indexOf(d.state) >= 0;

    return (
        <div className="mrd-page">
            {/* Breadcrumb */}
            <nav className="breadcrumb" aria-label="Breadcrumb">
                <button className="breadcrumb__link" onClick={function () { onNavigate('home'); }}>Accueil</button>
                <span className="breadcrumb__sep">›</span>
                <button className="breadcrumb__link" onClick={function () { onNavigate('modifications'); }}>Demandes de modification</button>
                <span className="breadcrumb__sep">›</span>
                <span className="breadcrumb__current">{d.number}</span>
            </nav>

            {/* Header banner */}
            <div className="mrd-banner">
                <div className="mrd-banner__info">
                    <div className="mrd-banner__number">{d.number}</div>
                    <h2 className="mrd-banner__title">{d.short_description || '(Aucune description)'}</h2>
                    <div className="mrd-banner__meta">
                        <StatusPill status={stateKey} />
                        <span className="mrd-banner__type">{typeLabel}</span>
                        <span className="mrd-banner__priority">Priorité : {priorityLabel}</span>
                    </div>
                </div>
            </div>

            {/* Action message */}
            {actionMsg && (
                <div className={'mrd-action-msg mrd-action-msg--' + actionMsg.type}>
                    {actionMsg.text}
                </div>
            )}

            {/* Action bar */}
            <div className="mrd-action-bar">
                <div className="mrd-action-bar__left">
                    {isClosed ? (
                        <span className="mrd-action-bar__closed">
                            {d.state === '3' ? '✅ Cette demande est résolue' :
                             d.state === '4' ? '🚫 Cette demande a été rejetée' :
                             '🔒 Cette demande est fermée'}
                        </span>
                    ) : (
                        <span className="mrd-action-bar__label">Actions disponibles :</span>
                    )}
                </div>
                <div className="mrd-action-bar__btns">
                    <button
                        className="mrd-action-btn mrd-action-btn--validate"
                        onClick={function () { setShowValidate(true); setActionMsg(null); }}
                        disabled={isClosed || saving}
                        title="Valider que la tâche a été réalisée"
                    >
                        ✅ Valider
                    </button>
                    <button
                        className="mrd-action-btn mrd-action-btn--complement"
                        onClick={function () { setShowCompModal(true); setActionMsg(null); }}
                        disabled={saving}
                        title="Créer une demande complémentaire sur le même article"
                    >
                        📝 Demande complémentaire
                    </button>
                    <button
                        className="mrd-action-btn mrd-action-btn--reject"
                        onClick={function () { setShowReject(true); setActionMsg(null); }}
                        disabled={isClosed || saving}
                        title="Rejeter cette demande"
                    >
                        🚫 Rejeter
                    </button>
                </div>
            </div>

            <div className="mrd-split">
                {/* Main content */}
                <section className="mrd-content">
                    {/* Description */}
                    {d.description && (
                        <div className="mrd-card">
                            <h3>📝 Description</h3>
                            <p className="mrd-card__text">{d.description}</p>
                        </div>
                    )}

                    {/* Linked review record */}
                    {reviewRecord && (
                        <div className="mrd-card mrd-card--linked">
                            <h3>📄 Article lié</h3>
                            <div className="mrd-linked-article">
                                <div className="mrd-linked-article__info">
                                    <span className="mrd-linked-article__title">{reviewRecord.display_title}</span>
                                    <div className="mrd-linked-article__meta">
                                        <StatusPill status={reviewRecord.review_status} />
                                        <StatusPill status={reviewRecord.freshness_score} />
                                        {reviewRecord.source_connector_name && (
                                            <span className="mrd-linked-article__source">📂 {reviewRecord.source_connector_name}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="mrd-linked-article__btn"
                                    onClick={function () { onNavigate('detail', reviewRecord.sys_id); }}
                                >
                                    Voir l'article →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resolution */}
                    {(d.resolution_summary || d.close_notes) && (
                        <div className={'mrd-card ' + (d.state === '3' ? 'mrd-card--resolution' : 'mrd-card--rejection')}>
                            <h3>{d.state === '3' ? '✅ Résolution' : d.state === '4' ? '🚫 Rejet' : '📋 Clôture'}</h3>
                            {d.resolution_summary && (
                                <div className="mrd-field">
                                    <span className="mrd-field__label">Résumé de résolution</span>
                                    <p className="mrd-card__text">{d.resolution_summary}</p>
                                </div>
                            )}
                            {d.close_notes && (
                                <div className="mrd-field">
                                    <span className="mrd-field__label">{d.state === '4' ? 'Motif du rejet' : 'Notes de clôture'}</span>
                                    <p className="mrd-card__text">{d.close_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Sidebar */}
                <aside className="mrd-sidebar">
                    <div className="meta-card">
                        <h3>Informations</h3>
                        <dl className="meta-grid">
                            <dt>Numéro</dt><dd>{d.number}</dd>
                            <dt>Type</dt><dd>{typeLabel}</dd>
                            <dt>État</dt><dd><StatusPill status={stateKey} /></dd>
                            <dt>Priorité</dt><dd>{priorityLabel}</dd>
                            <dt>Assigné à</dt><dd>{d.assigned_to || 'Non assigné'}</dd>
                            <dt>Groupe</dt><dd>{d.assignment_group || '—'}</dd>
                            <dt>Demandé par</dt><dd>{d.requested_by_reviewer || '—'}</dd>
                            <dt>Date cible</dt><dd>{d.target_resolution_date || '—'}</dd>
                            <dt>Créée le</dt><dd>{d.opened_at ? d.opened_at.substring(0, 10) : '—'}</dd>
                            {d.closed_at && (<><dt>Fermée le</dt><dd>{d.closed_at.substring(0, 10)}</dd></>)}
                            <dt>Mise à jour</dt><dd>{d.sys_updated_on ? d.sys_updated_on.substring(0, 10) : '—'}</dd>
                        </dl>
                    </div>

                    {reviewRecord && (
                        <div className="meta-card">
                            <h3>Article associé</h3>
                            <dl className="meta-grid">
                                <dt>Titre</dt><dd>{reviewRecord.display_title}</dd>
                                <dt>Statut</dt><dd><StatusPill status={reviewRecord.review_status} /></dd>
                                <dt>Réviseur</dt><dd>{reviewRecord.assigned_reviewer || 'Non assigné'}</dd>
                            </dl>
                            <button
                                className="mrd-sidebar-link"
                                onClick={function () { onNavigate('detail', reviewRecord.sys_id); }}
                            >
                                🔗 Ouvrir la fiche article
                            </button>
                        </div>
                    )}
                </aside>
            </div>

            {/* ═══ Validate Modal ═══ */}
            {showValidate && (
                <div className="modal-overlay" onClick={function () { setShowValidate(false); }}>
                    <aside className="modal-panel" onClick={function (e) { e.stopPropagation(); }} role="dialog" aria-label="Valider la demande">
                        <header className="modal-panel__header">
                            <h2>✅ Valider la demande</h2>
                            <button className="modal-close" onClick={function () { setShowValidate(false); }} aria-label="Fermer">✕</button>
                        </header>
                        <form className="modal-panel__body" onSubmit={handleValidate}>
                            <p className="mrd-modal-desc">
                                Confirmez que la tâche <strong>{d.number}</strong> a été réalisée. Un résumé de résolution est obligatoire.
                            </p>
                            <label className="form-field">
                                <span>Résumé de résolution *</span>
                                <textarea
                                    rows={4}
                                    value={resolutionSummary}
                                    onChange={function (e) { setResolutionSummary(e.target.value); }}
                                    required
                                    placeholder="Décrivez ce qui a été fait pour résoudre cette demande…"
                                ></textarea>
                            </label>
                            <div className="modal-panel__actions">
                                <button type="submit" className="btn-submit btn-submit--validate" disabled={saving || !resolutionSummary.trim()}>
                                    {saving ? '⟳ Enregistrement…' : '✅ Valider et résoudre'}
                                </button>
                                <button type="button" className="btn-cancel" onClick={function () { setShowValidate(false); }}>Annuler</button>
                            </div>
                        </form>
                    </aside>
                </div>
            )}

            {/* ═══ Reject Modal ═══ */}
            {showReject && (
                <div className="modal-overlay" onClick={function () { setShowReject(false); }}>
                    <aside className="modal-panel" onClick={function (e) { e.stopPropagation(); }} role="dialog" aria-label="Rejeter la demande">
                        <header className="modal-panel__header">
                            <h2>🚫 Rejeter la demande</h2>
                            <button className="modal-close" onClick={function () { setShowReject(false); }} aria-label="Fermer">✕</button>
                        </header>
                        <form className="modal-panel__body" onSubmit={handleReject}>
                            <p className="mrd-modal-desc">
                                Rejetez la demande <strong>{d.number}</strong>. Merci d'indiquer le motif du rejet.
                            </p>
                            <label className="form-field">
                                <span>Motif du rejet *</span>
                                <textarea
                                    rows={4}
                                    value={rejectReason}
                                    onChange={function (e) { setRejectReason(e.target.value); }}
                                    required
                                    placeholder="Expliquez pourquoi cette demande est rejetée…"
                                ></textarea>
                            </label>
                            <div className="modal-panel__actions">
                                <button type="submit" className="btn-submit btn-submit--reject" disabled={saving || !rejectReason.trim()}>
                                    {saving ? '⟳ Enregistrement…' : '🚫 Rejeter'}
                                </button>
                                <button type="button" className="btn-cancel" onClick={function () { setShowReject(false); }}>Annuler</button>
                            </div>
                        </form>
                    </aside>
                </div>
            )}

            {/* ═══ Complementary Request Modal (reuse existing) ═══ */}
            <ModificationModal
                isOpen={showCompModal}
                onClose={function () { setShowCompModal(false); }}
                onSubmit={handleComplementarySubmit}
                reviewRecordId={d.review_record}
            />
        </div>
    );
}
