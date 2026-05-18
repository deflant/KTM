import React, { useState } from 'react';
import '../components/ModificationModal.css';

export default function RemovalModal({ isOpen, onClose, onSubmit }) {
    var _r = useState(''), reason = _r[0], setReason = _r[1];

    if (!isOpen) return null;

    function handleSubmit() {
        if (!reason.trim()) return;
        onSubmit(reason.trim());
        setReason('');
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" onClick={function (e) { e.stopPropagation(); }}>
                <div className="modal-panel__header">
                    <h2>🗑 Demander le retrait</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-panel__body">
                    <p style={{ margin: 0, color: '#B71C1C', fontSize: '14px' }}>
                        Cette action va créer une demande de retrait pour cet article. L'article sera marqué comme nécessitant une re-revue.
                    </p>
                    <div className="form-field">
                        <span>Raison du retrait *</span>
                        <textarea
                            rows="4"
                            placeholder="Expliquez pourquoi cet article doit être retiré…"
                            value={reason}
                            onChange={function (e) { setReason(e.target.value); }}
                        />
                    </div>
                    <div className="modal-panel__actions">
                        <button className="btn-submit" style={{ background: '#B71C1C' }} onClick={handleSubmit} disabled={!reason.trim()}>🗑 Confirmer le retrait</button>
                        <button className="btn-cancel" onClick={onClose}>Annuler</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
