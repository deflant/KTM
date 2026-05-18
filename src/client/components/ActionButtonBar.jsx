import React from 'react';
import './ActionButtonBar.css';

export default function ActionButtonBar({ onApprove, onRequestMod, onRequestRemoval, onReassign, disabled }) {
    return (
        <div className="action-btn-bar">
            <button className="action-btn action-btn--approve" onClick={onApprove} disabled={disabled}>✓ Valider</button>
            <button className="action-btn action-btn--modify" onClick={onRequestMod} disabled={disabled}>✏ Demander modification</button>
            <button className="action-btn action-btn--remove" onClick={onRequestRemoval} disabled={disabled}>🗑 Demander retrait</button>
            <button className="action-btn action-btn--reassign" onClick={onReassign} disabled={disabled}>👤 Réassigner</button>
        </div>
    );
}
