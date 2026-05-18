import React from 'react';
import './NavSidebar.css';

const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'article-list', label: 'Liste des articles', icon: '📋' },
    { id: 'modifications', label: 'Modification Requests', icon: '✏️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'config', label: 'Configuration', icon: '⚙️' },
];

export default function NavSidebar({ activeView, onNavigate }) {
    return (
        <aside className="nav-sidebar">
            <header className="nav-sidebar__header">
                <div className="nav-sidebar__logo">🏛️</div>
                <span className="nav-sidebar__title">KTM</span>
            </header>
            <nav>
                <ul className="nav-sidebar__list">
                    {NAV_ITEMS.map(function (item) {
                        return (
                            <li key={item.id}>
                                <button
                                    className={'nav-sidebar__item ' + (activeView === item.id ? 'nav-sidebar__item--active' : '')}
                                    onClick={function () { onNavigate(item.id); }}
                                    aria-current={activeView === item.id ? 'page' : undefined}
                                >
                                    <span className="nav-sidebar__icon">{item.icon}</span>
                                    <span className="nav-sidebar__label">{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
