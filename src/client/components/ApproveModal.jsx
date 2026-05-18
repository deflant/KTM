import React, { useState } from 'react';
import '../components/ModificationModal.css';

export default function ApproveModal({ isOpen, onClose, onSubmit }) {
    var _n = useState(''), notes = _n[0], setNotes = _n[1];

    if (!isOpen) return null;

    function handleSubmit() {
        if (!notes.trim()) return;
        onSubmit(notes.trim());
        setNotes('');
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" onClick={function (e) { e.stopPropagation(); }}>
                <div className="modal-panel__header">
                    <h2>✓ Valider l'article</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-panel__body">
                    <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
                        En validant cet article, vous confirmez que son contenu est à jour et conforme.
                    </p>
                    <div className="form-field">
                        <span>Notes de validation *</span>
                        <textarea
                            rows="4"
                            placeholder="Commentaire sur la revue effectuée…"
                            value={notes}
                            onChange={function (e) { setNotes(e.target.value); }}
                        />
                    </div>
                    <div className="modal-panel__actions">
                        <button className="btn-submit" onClick={handleSubmit} disabled={!notes.trim()}>✓ Valider</button>
                        <button className="btn-cancel" onClick={onClose}>Annuler</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
