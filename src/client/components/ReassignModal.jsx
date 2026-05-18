import React, { useState, useCallback } from 'react';
import { searchUsers } from '../services/api.js';
import '../components/ModificationModal.css';
import './ReassignModal.css';

export default function ReassignModal({ isOpen, onClose, onSubmit }) {
    var _q = useState(''), query = _q[0], setQuery = _q[1];
    var _users = useState([]), users = _users[0], setUsers = _users[1];
    var _sel = useState(null), selected = _sel[0], setSelected = _sel[1];
    var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
    var _timer = useState(null), timer = _timer[0], setTimer = _timer[1];

    var doSearch = useCallback(function (term) {
        if (term.length < 2) { setUsers([]); return; }
        setLoading(true);
        searchUsers(term).then(function (results) {
            setUsers(results);
            setLoading(false);
        }).catch(function () { setLoading(false); });
    }, []);

    function handleInput(e) {
        var val = e.target.value;
        setQuery(val);
        setSelected(null);
        if (timer) clearTimeout(timer);
        var t = setTimeout(function () { doSearch(val); }, 300);
        setTimer(t);
    }

    function handleSelect(user) {
        setSelected(user);
        setQuery(user.name);
        setUsers([]);
    }

    function handleSubmit() {
        if (!selected) return;
        onSubmit(selected.sys_id);
        setQuery('');
        setSelected(null);
        setUsers([]);
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" onClick={function (e) { e.stopPropagation(); }}>
                <div className="modal-panel__header">
                    <h2>👤 Réassigner le réviseur</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-panel__body">
                    <div className="form-field">
                        <span>Rechercher un utilisateur</span>
                        <input
                            type="text"
                            placeholder="Tapez un nom, email ou identifiant…"
                            value={query}
                            onChange={handleInput}
                            autoFocus
                        />
                    </div>

                    {loading && <p className="reassign-loading">Recherche…</p>}

                    {users.length > 0 && (
                        <div className="reassign-results">
                            {users.map(function (u) {
                                return (
                                    <button
                                        key={u.sys_id}
                                        className={'reassign-user' + (selected && selected.sys_id === u.sys_id ? ' reassign-user--selected' : '')}
                                        onClick={function () { handleSelect(u); }}
                                    >
                                        <div className="reassign-user__avatar">👤</div>
                                        <div className="reassign-user__info">
                                            <div className="reassign-user__name">{u.name}</div>
                                            <div className="reassign-user__meta">{u.email || u.user_name}{u.title ? ' · ' + u.title : ''}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selected && (
                        <div className="reassign-selected">
                            Sélectionné : <strong>{selected.name}</strong> ({selected.email || selected.user_name})
                        </div>
                    )}

                    <div className="modal-panel__actions">
                        <button className="btn-submit" onClick={handleSubmit} disabled={!selected}>👤 Réassigner</button>
                        <button className="btn-cancel" onClick={onClose}>Annuler</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
