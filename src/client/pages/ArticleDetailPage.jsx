import React, { useState, useEffect } from 'react';
import useArticleDetail from '../hooks/useArticleDetail.js';
import { resolveWebCrawlerUrl, updateApproval } from '../services/api.js';
import StatusPill from '../components/StatusPill.jsx';
import ActionButtonBar from '../components/ActionButtonBar.jsx';
import ModificationModal from '../components/ModificationModal.jsx';
import ApproveModal from '../components/ApproveModal.jsx';
import RemovalModal from '../components/RemovalModal.jsx';
import ReassignModal from '../components/ReassignModal.jsx';
import './ArticleDetailPage.css';

var STATE_LABELS = { '1': 'Brouillon', '2': 'Soumis', '3': 'Résolu', '4': 'Rejeté', '7': 'Annulé', '18': 'En cours' };
var PRIORITY_LABELS = { '1': '🔴 Critique', '2': '🟠 Haute', '3': '🟡 Moyenne', '4': '🟢 Basse', '5': '⚪ Planification' };
var TYPE_LABELS = {
    content_update: '✏️ Mise à jour', factual_correction: '📌 Correction', outdated_info: '⏰ Info obsolète',
    missing_section: '📄 Section manquante', formatting_issue: '🎨 Formatage', retire_article: '🗑️ Retrait',
    retirement: '🗑️ Retrait',
};
var APPROVAL_STATE_ICONS = { requested: '⏳', approved: '✅', rejected: '❌', cancelled: '🚫', not_requested: '—' };

export default function ArticleDetailPage({ id, onNavigate }) {
    var hook = useArticleDetail(id);
    var _modModal = useState(false), showModModal = _modModal[0], setShowModModal = _modModal[1];
    var _appModal = useState(false), showAppModal = _appModal[0], setShowAppModal = _appModal[1];
    var _remModal = useState(false), showRemModal = _remModal[0], setShowRemModal = _remModal[1];
    var _reaModal = useState(false), showReaModal = _reaModal[0], setShowReaModal = _reaModal[1];
    var _note = useState(''), noteText = _note[0], setNoteText = _note[1];
    var _saving = useState(false), saving = _saving[0], setSaving = _saving[1];
    var _resolvedUrl = useState(''), resolvedUrl = _resolvedUrl[0], setResolvedUrl = _resolvedUrl[1];
    var _rlTab = useState('tasks'), rlTab = _rlTab[0], setRlTab = _rlTab[1];

    // Approval action state
    var _approvalAction = useState(null), approvalAction = _approvalAction[0], setApprovalAction = _approvalAction[1];
    var _approvalComment = useState(''), approvalComment = _approvalComment[0], setApprovalComment = _approvalComment[1];
    var _approvalSaving = useState(false), approvalSaving = _approvalSaving[0], setApprovalSaving = _approvalSaving[1];
    var _approvalMsg = useState(null), approvalMsg = _approvalMsg[0], setApprovalMsg = _approvalMsg[1];

    var d = hook.detail || {};
    var art = d.article || {};
    var ai = hook.articleInfo || {};
    var sourceType = d.source_connector_type || ai.source_connector_type || '';
    var displayTitleRaw = d.external_doc_title || d.display_title || ai.article_title || art.short_description || 'Article sans titre';
    displayTitleRaw = displayTitleRaw.replace(/<\/?highlight>/g, '');

    useEffect(function () {
        if (sourceType === 'web_crawler' && displayTitleRaw) {
            resolveWebCrawlerUrl(displayTitleRaw).then(function (url) { setResolvedUrl(url); });
        } else { setResolvedUrl(''); }
    }, [sourceType, displayTitleRaw]);

    if (hook.loading) return React.createElement('div', { className: 'loading' }, 'Chargement…');
    if (hook.error) return React.createElement('div', { className: 'error-msg' }, 'Erreur : ' + hook.error);
    if (!hook.detail) return React.createElement('div', { className: 'error-msg' }, 'Article non trouvé');

    var displayTitle = displayTitleRaw;
    var sourceName = d.source_connector_name || ai.source_connector_name || '';
    var rawUrl = ai.article_url || d.external_doc_url || art.source_url || '';
    var articleUrl = sourceType === 'web_crawler' ? resolvedUrl : rawUrl;

    function handleApprove(notes) {
        setSaving(true);
        hook.approve(notes).then(function () { setSaving(false); setShowAppModal(false); });
    }
    function handleRemoval(reason) {
        setSaving(true);
        hook.requestRemoval(reason).then(function () { setSaving(false); setShowRemModal(false); });
    }
    function handleModSubmit(data) {
        setSaving(true);
        hook.requestModification(data).then(function () { setSaving(false); setShowModModal(false); });
    }
    function handleReassign(userId) {
        setSaving(true);
        hook.reassign(userId).then(function () { setSaving(false); setShowReaModal(false); });
    }
    function handleAddNote() {
        if (!noteText.trim()) return;
        setSaving(true);
        hook.addNote(noteText.trim()).then(function () { setNoteText(''); setSaving(false); });
    }

    // Parse notes
    var activityEntries = [];
    if (d.review_notes) {
        var parts = d.review_notes.split('\n---\n');
        for (var i = 0; i < parts.length; i++) {
            var raw = parts[i].trim();
            if (!raw) continue;
            var match = raw.match(/^\[([^\|]+)\|([^\]]+)\]\s*(.*)$/s);
            if (match) {
                activityEntries.push({ author: match[1].trim(), date: match[2].trim(), text: match[3].trim(), index: i });
            } else {
                activityEntries.push({ author: '', date: '', text: raw, index: i });
            }
        }
    }

    var pendingApprovals = (hook.approvals || []).filter(function (a) { return a.state === 'requested'; });

    function openApprovalAction(approvalSysId, actionType) {
        setApprovalAction({ sys_id: approvalSysId, type: actionType });
        setApprovalComment('');
        setApprovalMsg(null);
    }

    function handleApprovalSubmit(e) {
        e.preventDefault();
        if (!approvalAction) return;
        setApprovalSaving(true);
        updateApproval(approvalAction.sys_id, approvalAction.type, approvalComment.trim() || undefined)
            .then(function () {
                setApprovalSaving(false);
                setApprovalMsg({
                    type: 'success',
                    text: approvalAction.type === 'approved'
                        ? '✅ Approbation accordée avec succès.'
                        : '❌ Approbation rejetée.',
                });
                setApprovalAction(null);
                setApprovalComment('');
                hook.refresh();
            })
            .catch(function (err) {
                setApprovalSaving(false);
                setApprovalMsg({ type: 'error', text: '❌ Erreur : ' + (err.message || 'Échec') });
            });
    }

    function formatDate(dt) {
        if (!dt) return '—';
        return dt.length > 16 ? dt.substring(0, 16) : dt;
    }

    return (
        <div className="detail-page">
            <nav className="breadcrumb" aria-label="Breadcrumb">
                <button className="breadcrumb__link" onClick={function () { onNavigate('home'); }}>Accueil</button>
                <span className="breadcrumb__sep">›</span>
                <button className="breadcrumb__link" onClick={function () { onNavigate('article-list'); }}>Liste des articles</button>
                <span className="breadcrumb__sep">›</span>
                <span className="breadcrumb__current">{displayTitle}</span>
            </nav>

            {/* Link banner */}
            <div className="detail-link-banner">
                <div className="detail-link-banner__info">
                    <h2 className="detail-link-banner__title">{displayTitle}</h2>
                    <div className="detail-link-banner__meta">
                        <StatusPill status={d.review_status} />
                        <StatusPill status={d.freshness_score} />
                        {sourceName && <span className="detail-link-banner__source">📂 {sourceName}</span>}
                        {sourceType && <span className="detail-link-banner__type">({sourceType})</span>}
                    </div>
                </div>
                {articleUrl ? (
                    <a className="detail-link-banner__btn" href={articleUrl} target="_blank" rel="noopener noreferrer">
                        🔗 Ouvrir l'article source
                    </a>
                ) : (
                    <span className="detail-link-banner__no-link">Lien non disponible</span>
                )}
            </div>

            <div className="detail-split">
                <section className="detail-content">
                    {art.text ? (
                        <div className="article-card">
                            <h3>Contenu de l'article</h3>
                            <div className="article-body" dangerouslySetInnerHTML={{ __html: art.text }}></div>
                        </div>
                    ) : (
                        <div className="article-card article-card--external">
                            <div className="article-card__icon">📄</div>
                            <p>Cet article est hébergé sur une source externe.</p>
                            {articleUrl && (
                                <a className="btn-open-source" href={articleUrl} target="_blank" rel="noopener noreferrer">
                                    🔗 Consulter l'article sur {sourceName || 'la source'}
                                </a>
                            )}
                        </div>
                    )}

                    {/* ═══ Related Lists with Tabs ═══ */}
                    <div className="rl-container">
                        <div className="rl-tabs" role="tablist">
                            <button
                                className={'rl-tab' + (rlTab === 'tasks' ? ' rl-tab--active' : '')}
                                role="tab"
                                aria-selected={rlTab === 'tasks'}
                                onClick={function () { setRlTab('tasks'); }}
                            >
                                📋 Demandes associées
                                <span className="rl-tab__badge">{hook.modRequests.length}</span>
                            </button>
                            <button
                                className={'rl-tab' + (rlTab === 'approvals' ? ' rl-tab--active' : '')}
                                role="tab"
                                aria-selected={rlTab === 'approvals'}
                                onClick={function () { setRlTab('approvals'); }}
                            >
                                ✅ Approbations
                                <span className="rl-tab__badge">{hook.approvals.length}</span>
                                {pendingApprovals.length > 0 && (
                                    <span className="rl-tab__pending">
                                        {pendingApprovals.length} en attente
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* ── Tasks Tab ── */}
                        {rlTab === 'tasks' && (
                            <div className="rl-panel" role="tabpanel">
                                {hook.modRequests.length > 0 ? (
                                    <table className="rl-table">
                                        <thead>
                                            <tr>
                                                <th>Numéro</th>
                                                <th>Description</th>
                                                <th>Type</th>
                                                <th>État</th>
                                                <th>Priorité</th>
                                                <th>Assigné à</th>
                                                <th>Créé le</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hook.modRequests.map(function (mr) {
                                                return (
                                                    <tr key={mr.sys_id} className="rl-table__row rl-table__row--clickable"
                                                        onClick={function () { onNavigate('mod-detail', mr.sys_id); }}>
                                                        <td className="rl-table__number">
                                                            {mr.number || '—'}
                                                        </td>
                                                        <td className="rl-table__desc" title={mr.short_description}>
                                                            {mr.short_description || '—'}
                                                        </td>
                                                        <td>
                                                            <span className="rl-type-badge">
                                                                {TYPE_LABELS[mr.modification_type] || mr.modification_type_display || mr.modification_type || '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={'rl-state-badge rl-state-badge--' + mr.state}>
                                                                {mr.state_display || STATE_LABELS[mr.state] || mr.state || '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="rl-priority-badge">
                                                                {PRIORITY_LABELS[mr.priority] || mr.priority_display || mr.priority || '—'}
                                                            </span>
                                                        </td>
                                                        <td>{mr.assigned_to || <span className="rl-unassigned">Non assigné</span>}</td>
                                                        <td className="rl-table__date">{formatDate(mr.sys_created_on)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="rl-empty">
                                        <span className="rl-empty__icon">📋</span>
                                        <p>Aucune demande de modification associée à cet article.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Approvals Tab ── */}
                        {rlTab === 'approvals' && (
                            <div className="rl-panel" role="tabpanel">
                                {approvalMsg && (
                                    <div className={'rl-approval-msg rl-approval-msg--' + approvalMsg.type}>
                                        {approvalMsg.text}
                                    </div>
                                )}
                                {hook.approvals.length > 0 ? (
                                    <table className="rl-table">
                                        <thead>
                                            <tr>
                                                <th>État</th>
                                                <th>Approbateur</th>
                                                <th>Document</th>
                                                <th>Créé le</th>
                                                <th>Commentaires</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {hook.approvals.map(function (ap) {
                                                var stateIcon = APPROVAL_STATE_ICONS[ap.state] || '❔';
                                                var isPending = ap.state === 'requested';
                                                return (
                                                    <tr key={ap.sys_id} className={'rl-table__row' + (isPending ? ' rl-table__row--pending' : '')}>
                                                        <td>
                                                            <span className={'rl-approval-state rl-approval-state--' + ap.state}>
                                                                {stateIcon} {ap.state_display || ap.state}
                                                            </span>
                                                        </td>
                                                        <td className="rl-table__approver">{ap.approver || '—'}</td>
                                                        <td className="rl-table__doc">{ap.document_display || '—'}</td>
                                                        <td className="rl-table__date">{formatDate(ap.sys_created_on)}</td>
                                                        <td className="rl-table__comments" title={ap.comments}>
                                                            {ap.comments ? (ap.comments.length > 50 ? ap.comments.substring(0, 50) + '…' : ap.comments) : '—'}
                                                        </td>
                                                        <td className="rl-table__actions">
                                                            {isPending ? (
                                                                <div className="rl-inline-actions">
                                                                    <button
                                                                        className="rl-inline-btn rl-inline-btn--approve"
                                                                        onClick={function () { openApprovalAction(ap.sys_id, 'approved'); }}
                                                                        disabled={approvalSaving}
                                                                        title="Approuver"
                                                                    >
                                                                        ✅ Approuver
                                                                    </button>
                                                                    <button
                                                                        className="rl-inline-btn rl-inline-btn--reject"
                                                                        onClick={function () { openApprovalAction(ap.sys_id, 'rejected'); }}
                                                                        disabled={approvalSaving}
                                                                        title="Rejeter"
                                                                    >
                                                                        ❌ Rejeter
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="rl-table__no-action">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="rl-empty">
                                        <span className="rl-empty__icon">✅</span>
                                        <p>Aucune approbation liée aux demandes de cet article.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Activity */}
                    <div className="activity-card">
                        <h3>💬 Activité & Commentaires</h3>

                        {d.last_reviewed_on && (
                            <div className="activity-entry activity-entry--system">
                                <div className="activity-entry__icon">✓</div>
                                <div className="activity-entry__body">
                                    <span className="activity-entry__label">Dernière revue</span>
                                    <span className="activity-entry__detail">{d.last_reviewed_by || 'Système'} — {d.last_reviewed_on}</span>
                                </div>
                            </div>
                        )}

                        {activityEntries.length > 0 ? (
                            activityEntries.map(function (entry) {
                                return (
                                    <div className="activity-entry" key={entry.index}>
                                        <div className="activity-entry__icon">📝</div>
                                        <div className="activity-entry__body">
                                            {entry.author && (
                                                <div className="activity-entry__header">
                                                    <span className="activity-entry__author">👤 {entry.author}</span>
                                                    {entry.date && <span className="activity-entry__date">{entry.date}</span>}
                                                </div>
                                            )}
                                            <p className="activity-entry__text">{entry.text}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="activity-empty">Aucun commentaire pour le moment.</p>
                        )}

                        <div className="activity-add">
                            <textarea className="activity-add__input" placeholder="Ajouter un commentaire…"
                                value={noteText} onChange={function (e) { setNoteText(e.target.value); }} rows="3" />
                            <button className="activity-add__btn" onClick={handleAddNote} disabled={saving || !noteText.trim()}>
                                {saving ? '⟳' : '💬'} Envoyer
                            </button>
                        </div>
                    </div>
                </section>

                <aside className="detail-sidebar">
                    <div className="meta-card">
                        <h3>Informations</h3>
                        <dl className="meta-grid">
                            <dt>Source</dt><dd>{sourceName || '—'}</dd>
                            <dt>Type</dt><dd>{sourceType || '—'}</dd>
                            <dt>Statut</dt><dd><StatusPill status={d.review_status} /></dd>
                            <dt>Fraîcheur</dt><dd><StatusPill status={d.freshness_score} /></dd>
                            <dt>Réviseur</dt><dd>{d.assigned_reviewer || 'Non assigné'}</dd>
                            <dt>Groupe</dt><dd>{d.reviewer_group || '—'}</dd>
                            <dt>Dernière MAJ</dt><dd>{d.last_external_update || '—'}</dd>
                            <dt>Dernière revue</dt><dd>{d.last_reviewed_on || 'Jamais'}</dd>
                            <dt>Révisé par</dt><dd>{d.last_reviewed_by || '—'}</dd>
                            {art.kb_knowledge_base && (<><dt>Base KB</dt><dd>{art.kb_knowledge_base}</dd></>)}
                            {art.author && (<><dt>Auteur</dt><dd>{art.author}</dd></>)}
                        </dl>
                    </div>

                    <div className="meta-card">
                        <h3>Actions</h3>
                        <ActionButtonBar
                            onApprove={function () { setShowAppModal(true); }}
                            onRequestMod={function () { setShowModModal(true); }}
                            onRequestRemoval={function () { setShowRemModal(true); }}
                            onReassign={function () { setShowReaModal(true); }}
                            disabled={saving}
                        />
                    </div>

                    {/* Quick summary cards */}
                    <div className="meta-card">
                        <h3>Résumé</h3>
                        <div className="rl-summary">
                            <div className="rl-summary__item">
                                <span className="rl-summary__value">{hook.modRequests.length}</span>
                                <span className="rl-summary__label">Demandes</span>
                            </div>
                            <div className="rl-summary__item">
                                <span className="rl-summary__value">{pendingApprovals.length}</span>
                                <span className="rl-summary__label">Approbations en attente</span>
                            </div>
                            <div className="rl-summary__item">
                                <span className="rl-summary__value">{hook.modRequests.filter(function (m) { return m.state !== '3' && m.state !== '4' && m.state !== '7'; }).length}</span>
                                <span className="rl-summary__label">Tâches ouvertes</span>
                            </div>
                        </div>
                    </div>

                    {articleUrl && (
                        <div className="meta-card">
                            <h3>Lien vers l'article</h3>
                            <a className="sidebar-ext-link" href={articleUrl} target="_blank" rel="noopener noreferrer">
                                🔗 {articleUrl.length > 50 ? articleUrl.substring(0, 50) + '…' : articleUrl}
                            </a>
                        </div>
                    )}
                </aside>
            </div>

            {/* Modals */}
            <ApproveModal isOpen={showAppModal} onClose={function () { setShowAppModal(false); }} onSubmit={handleApprove} />
            <RemovalModal isOpen={showRemModal} onClose={function () { setShowRemModal(false); }} onSubmit={handleRemoval} />
            <ReassignModal isOpen={showReaModal} onClose={function () { setShowReaModal(false); }} onSubmit={handleReassign} />
            <ModificationModal isOpen={showModModal} onClose={function () { setShowModModal(false); }} onSubmit={handleModSubmit} reviewRecordId={id} />

            {/* Approval Action Modal */}
            {approvalAction && (
                <div className="modal-overlay" onClick={function () { setApprovalAction(null); }}>
                    <aside className="modal-panel" onClick={function (e) { e.stopPropagation(); }} role="dialog"
                        aria-label={approvalAction.type === 'approved' ? 'Approuver' : 'Rejeter l\'approbation'}>
                        <header className="modal-panel__header">
                            <h2>{approvalAction.type === 'approved' ? '✅ Approuver' : '❌ Rejeter l\'approbation'}</h2>
                            <button className="modal-close" onClick={function () { setApprovalAction(null); }} aria-label="Fermer">✕</button>
                        </header>
                        <form className="modal-panel__body" onSubmit={handleApprovalSubmit}>
                            <p className="rl-approval-modal-desc">
                                {approvalAction.type === 'approved'
                                    ? 'Confirmez que le travail réalisé est satisfaisant et approuvez cette demande.'
                                    : 'Indiquez le motif du rejet de cette approbation.'}
                            </p>
                            <label className="form-field">
                                <span>Commentaire {approvalAction.type === 'rejected' ? '*' : '(optionnel)'}</span>
                                <textarea
                                    rows={3}
                                    value={approvalComment}
                                    onChange={function (e) { setApprovalComment(e.target.value); }}
                                    placeholder={approvalAction.type === 'approved'
                                        ? 'Commentaire facultatif…'
                                        : 'Motif du rejet…'}
                                    required={approvalAction.type === 'rejected'}
                                ></textarea>
                            </label>
                            <div className="modal-panel__actions">
                                <button
                                    type="submit"
                                    className={'btn-submit ' + (approvalAction.type === 'approved' ? 'btn-submit--validate' : 'btn-submit--reject')}
                                    disabled={approvalSaving || (approvalAction.type === 'rejected' && !approvalComment.trim())}
                                >
                                    {approvalSaving ? '⟳ Enregistrement…' : (approvalAction.type === 'approved' ? '✅ Approuver' : '❌ Rejeter')}
                                </button>
                                <button type="button" className="btn-cancel" onClick={function () { setApprovalAction(null); }}>Annuler</button>
                            </div>
                        </form>
                    </aside>
                </div>
            )}
        </div>
    );
}
