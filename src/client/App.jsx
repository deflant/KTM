import React, { useState, useEffect, useCallback } from 'react';
import NavSidebar from './components/NavSidebar.jsx';
import HomePage from './pages/HomePage.jsx';
import ArticleDetailPage from './pages/ArticleDetailPage.jsx';
import ArticleListPage from './pages/ArticleListPage.jsx';
import ModificationRequestsPage from './pages/ModificationRequestsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ConfigurationPage from './pages/ConfigurationPage.jsx';
import ModificationRequestDetailPage from './pages/ModificationRequestDetailPage.jsx';
import { fetchExcludedSources } from './services/api.js';
import './App.css';

function parseHash() {
    var hash = '';
    try { hash = window.location.hash || ''; } catch (e) { /* ignore */ }
    var parts = hash.replace(/^#\/?/, '').split('/');
    return { page: parts[0] || 'home', id: parts[1] || null };
}

export default function App() {
    var _s = useState(function () { return parseHash(); }), route = _s[0], setRoute = _s[1];
    var _ex = useState([]), excludedNames = _ex[0], setExcludedNames = _ex[1];
    var _exLoaded = useState(false), exLoaded = _exLoaded[0], setExLoaded = _exLoaded[1];

    /* Load excluded source names on mount */
    var loadExclusions = useCallback(function () {
        return fetchExcludedSources().then(function (list) {
            var names = list.map(function (e) { return e.source_name; });
            setExcludedNames(names);
            setExLoaded(true);
        }).catch(function () { setExLoaded(true); });
    }, []);

    useEffect(function () { loadExclusions(); }, [loadExclusions]);

    useEffect(function () {
        function onHashChange() {
            setRoute(parseHash());
        }
        window.addEventListener('hashchange', onHashChange);
        return function () { window.removeEventListener('hashchange', onHashChange); };
    }, []);

    function navigate(page, id) {
        var newRoute = { page: page || 'home', id: id || null };
        setRoute(newRoute);
        try {
            var newHash = id ? '#' + page + '/' + id : '#' + page;
            window.location.hash = newHash;
        } catch (e) { /* ignore in restricted iframe contexts */ }
    }

    function renderPage() {
        switch (route.page) {
            case 'home': return React.createElement(HomePage, { onNavigate: navigate, excludedSources: excludedNames });
            case 'article-list': return React.createElement(ArticleListPage, { onNavigate: navigate, excludedSources: excludedNames });
            case 'detail': return React.createElement(ArticleDetailPage, { id: route.id, onNavigate: navigate });
            case 'modifications': return React.createElement(ModificationRequestsPage, { onNavigate: navigate });
            case 'mod-detail': return React.createElement(ModificationRequestDetailPage, { id: route.id, onNavigate: navigate });
            case 'analytics': return React.createElement(AnalyticsPage, { excludedSources: excludedNames });
            case 'config': return React.createElement(ConfigurationPage, { excludedSources: excludedNames, onExclusionsChanged: loadExclusions });
            default: return React.createElement(HomePage, { onNavigate: navigate, excludedSources: excludedNames });
        }
    }

    return (
        <div className="app-layout">
            <NavSidebar activeView={route.page} onNavigate={function (v) { navigate(v); }} />
            <main className="app-main">
                <header className="app-topbar">
                    <h1 className="app-topbar__title">Knowledge Trust Manager</h1>
                    <div className="app-topbar__user">
                        <span className="app-topbar__avatar">👤</span>
                    </div>
                </header>
                <div className="app-content">
                    {exLoaded ? renderPage() : (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>Chargement…</div>
                    )}
                </div>
            </main>
        </div>
    );
}
