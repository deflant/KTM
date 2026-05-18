import React, { useState, useEffect } from 'react';
import { fetchAllSourceNames, fetchExcludedSources, addSourceExclusion, removeSourceExclusion, syncKBArticlesFromServer, syncArticleListFromConnectors } from '../services/api.js';
import './ConfigurationPage.css';

export default function ConfigurationPage({ excludedSources, onExclusionsChanged }) {
    var _t = useState('sources'), tab = _t[0], setTab = _t[1];
    var _sources = useState([]), allSources = _sources[0], setAllSources = _sources[1];
    var _exclusions = useState([]), exclusions = _exclusions[0], setExclusions = _exclusions[1];
    var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
    var _saving = useState(null), saving = _saving[0], setSaving = _saving[1];

    // Sync state
    var _syncingKB = useState(false), syncingKB = _syncingKB[0], setSyncingKB = _syncingKB[1];
    var _syncingExt = useState(false), syncingExt = _syncingExt[0], setSyncingExt = _syncingExt[1];
    var _syncResult = useState(null), syncResult = _syncResult[0], setSyncResult = _syncResult[1];

    function loadData() {
        setLoading(true);
        Promise.all([
            fetchAllSourceNames(),
            fetchExcludedSources(),
        ]).then(function (results) {
            setAllSources(results[0] || []);
            setExclusions(results[1] || []);
            setLoading(false);
        }).catch(function () { setLoading(false); });
    }

    useEffect(function () { loadData(); }, []);

    function isExcluded(sourceName) {
        return exclusions.some(function (e) { return e.source_name === sourceName; });
    }

    function getExclusionId(sourceName) {
        var found = exclusions.find(function (e) { return e.source_name === sourceName; });
        return found ? found.sys_id : null;
    }

    function handleToggle(sourceName) {
        if (saving) return;
        setSaving(sourceName);

        if (isExcluded(sourceName)) {
            var sysId = getExclusionId(sourceName);
            if (!sysId) { setSaving(null); return; }
            removeSourceExclusion(sysId).then(function () {
                setSaving(null);
                loadData();
                if (onExclusionsChanged) onExclusionsChanged();
            }).catch(function () { setSaving(null); });
        } else {
            addSourceExclusion(sourceName).then(function () {
                setSaving(null);
                loadData();
                if (onExclusionsChanged) onExclusionsChanged();
            }).catch(function () { setSaving(null); });
        }
    }

    var TYPE_ICONS = { confluence: '🔗', sharepoint: '📁', web_crawler: '🌐', google_drive: '📄', servicenow_kb: '📚' };

    function handleSyncKB() {
        setSyncingKB(true);
        setSyncResult(null);
        syncKBArticlesFromServer().then(function (data) {
            setSyncingKB(false);
            var r = (data && data.result) ? data.result : data;
            setSyncResult({ type: 'kb', data: r });
        }).catch(function (err) {
            setSyncingKB(false);
            setSyncResult({ type: 'kb', error: String(err) });
        });
    }

    function handleSyncExt() {
        setSyncingExt(true);
        setSyncResult(null);
        syncArticleListFromConnectors().then(function (data) {
            setSyncingExt(false);
            var r = (data && data.result) ? data.result : data;
            setSyncResult({ type: 'ext', data: r });
        }).catch(function (err) {
            setSyncingExt(false);
            setSyncResult({ type: 'ext', error: String(err) });
        });
    }

    return (
        <div className="config-page">
            <h1>⚙️ Configuration</h1>
            <nav className="config-tabs" aria-label="Configuration tabs">
                <button className={'config-tab ' + (tab === 'sources' ? 'config-tab--active' : '')} onClick={function () { setTab('sources'); }}>Sources</button>
                <button className={'config-tab ' + (tab === 'sync' ? 'config-tab--active' : '')} onClick={function () { setTab('sync'); }}>Synchronisation</button>
                <button className={'config-tab ' + (tab === 'settings' ? 'config-tab--active' : '')} onClick={function () { setTab('settings'); }}>Paramètres</button>
                <button className={'config-tab ' + (tab === 'roles' ? 'config-tab--active' : '')} onClick={function () { setTab('roles'); }}>Rôles</button>
            </nav>

            {tab === 'sources' && (
                <section className="config-section">
                    <h2>Gestion des sources</h2>
                    <p className="config-help">
                        Activez ou désactivez les sources de contenu. Les sources désactivées seront exclues de toutes les vues : liste des articles, analytics, KPIs et page d'accueil.
                    </p>

                    {loading ? (
                        <div className="config-loading"><span className="config-spinner">⟳</span> Chargement des sources…</div>
                    ) : allSources.length === 0 ? (
                        <div className="config-empty">Aucune source de contenu externe détectée.</div>
                    ) : (
                        <React.Fragment>
                            <div className="source-summary">
                                <span className="source-summary__active">✅ {allSources.length - exclusions.length} active{allSources.length - exclusions.length !== 1 ? 's' : ''}</span>
                                <span className="source-summary__excluded">🚫 {exclusions.length} exclue{exclusions.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="source-grid">
                                {allSources.map(function (src) {
                                    var excluded = isExcluded(src.name);
                                    var isSaving = saving === src.name;
                                    var icon = TYPE_ICONS[src.type] || '📂';
                                    return (
                                        <div className={'source-card ' + (excluded ? 'source-card--excluded' : 'source-card--active')} key={src.name}>
                                            <div className="source-card__info">
                                                <span className="source-card__icon">{icon}</span>
                                                <div className="source-card__text">
                                                    <span className="source-card__name">{src.name}</span>
                                                    <span className="source-card__type">{src.type}</span>
                                                </div>
                                            </div>
                                            <div className="source-card__actions">
                                                <span className={'source-card__status ' + (excluded ? 'source-card__status--off' : 'source-card__status--on')}>
                                                    {excluded ? 'Exclue' : 'Active'}
                                                </span>
                                                <button
                                                    className={'source-toggle ' + (excluded ? 'source-toggle--off' : 'source-toggle--on')}
                                                    onClick={function () { handleToggle(src.name); }}
                                                    disabled={isSaving}
                                                    title={excluded ? 'Réactiver cette source' : 'Exclure cette source'}
                                                    aria-label={(excluded ? 'Réactiver ' : 'Exclure ') + src.name}
                                                >
                                                    <span className="source-toggle__track">
                                                        <span className="source-toggle__thumb">{isSaving ? '⟳' : ''}</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </React.Fragment>
                    )}
                </section>
            )}

            {tab === 'sync' && (
                <section className="config-section">
                    <h2>Synchronisation des articles</h2>
                    <p className="config-help">
                        Lancez une synchronisation pour importer les articles dans le workspace KTM. Les articles déjà existants ne seront pas dupliqués.
                    </p>

                    <div className="sync-grid">
                        <div className="sync-card">
                            <div className="sync-card__header">
                                <span className="sync-card__icon">📚</span>
                                <h3>Articles ServiceNow KB</h3>
                            </div>
                            <p>Scanne tous les articles publiés dans les bases de connaissance ServiceNow (<code>kb_knowledge</code>) et crée les fiches de revue et entrées dans la liste des articles.</p>
                            <button
                                className="sync-btn sync-btn--kb"
                                onClick={handleSyncKB}
                                disabled={syncingKB}
                            >
                                {syncingKB ? '⟳ Synchronisation en cours…' : '📚 Synchroniser les articles KB'}
                            </button>
                            {syncResult && syncResult.type === 'kb' && !syncResult.error && (
                                <div className="sync-result sync-result--success">
                                    ✅ {syncResult.data.records_created || 0} review records créés, {syncResult.data.articles_created || 0} articles ajoutés ({syncResult.data.records_skipped || 0} déjà existants sur {syncResult.data.total_scanned || 0} scannés)
                                </div>
                            )}
                            {syncResult && syncResult.type === 'kb' && syncResult.error && (
                                <div className="sync-result sync-result--error">❌ Erreur : {syncResult.error}</div>
                            )}
                        </div>

                        <div className="sync-card">
                            <div className="sync-card__header">
                                <span className="sync-card__icon">🌐</span>
                                <h3>Connecteurs externes</h3>
                            </div>
                            <p>Scanne les documents indexés par AI Search (Confluence, SharePoint, Web Crawler, etc.) et crée les entrées dans la liste des articles.</p>
                            <button
                                className="sync-btn sync-btn--ext"
                                onClick={handleSyncExt}
                                disabled={syncingExt}
                            >
                                {syncingExt ? '⟳ Synchronisation en cours…' : '🌐 Synchroniser les connecteurs externes'}
                            </button>
                            {syncResult && syncResult.type === 'ext' && !syncResult.error && (
                                <div className="sync-result sync-result--success">
                                    ✅ {syncResult.data.articles_created || 0} articles créés, {syncResult.data.articles_updated || 0} mis à jour ({syncResult.data.total_found || 0} trouvés)
                                </div>
                            )}
                            {syncResult && syncResult.type === 'ext' && syncResult.error && (
                                <div className="sync-result sync-result--error">❌ Erreur : {syncResult.error}</div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {tab === 'settings' && (
                <section className="config-section">
                    <h2>Paramètres de l'application</h2>
                    <p className="config-help">Ces paramètres sont gérés via les propriétés système ServiceNow.</p>
                    <div className="settings-grid">
                        <div className="setting-item"><h3>Seuil Frais</h3><p>Articles en dessous de ce nombre de jours sont « Frais »</p><span className="setting-value">30 jours</span></div>
                        <div className="setting-item"><h3>Seuil Obsolète</h3><p>Articles au dessus de ce nombre de jours sont « Obsolètes »</p><span className="setting-value">90 jours</span></div>
                        <div className="setting-item"><h3>SLA Revue</h3><p>Jours ouvrés pour la revue initiale d'un article</p><span className="setting-value">5 jours</span></div>
                        <div className="setting-item"><h3>SLA Modification</h3><p>Jours ouvrés pour la résolution d'une demande</p><span className="setting-value">10 jours</span></div>
                    </div>
                </section>
            )}

            {tab === 'roles' && (
                <section className="config-section">
                    <h2>Rôles de l'application</h2>
                    <div className="roles-grid">
                        <div className="role-card"><h3>🔍 Consumer</h3><p>Lecture seule des fiches de revue et du contenu.</p></div>
                        <div className="role-card"><h3>✅ Reviewer</h3><p>Peut approuver, demander des modifications et ajouter des commentaires.</p></div>
                        <div className="role-card"><h3>📋 Coordinator</h3><p>Gère les assignations, les opérations en lot et les analytics.</p></div>
                        <div className="role-card"><h3>⚙️ Admin</h3><p>Accès complet à la configuration, aux exclusions de sources et aux propriétés.</p></div>
                    </div>
                </section>
            )}
        </div>
    );
}
