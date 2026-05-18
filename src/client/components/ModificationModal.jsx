import React, { useState } from 'react';
import './ModificationModal.css';

export default function ModificationModal({ isOpen, onClose, onSubmit, reviewRecordId }) {
    var _s = useState('content_update'), modType = _s[0], setModType = _s[1];
    var _d = useState(''), desc = _d[0], setDesc = _d[1];
    var _sh = useState(''), shortDesc = _sh[0], setShortDesc = _sh[1];
    var _p = useState('3'), priority = _p[0], setPriority = _p[1];
    var _t = useState(''), targetDate = _t[0], setTargetDate = _t[1];

    if (!isOpen) return null;

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit({
            review_record: reviewRecordId,
            modification_type: modType,
            short_description: shortDesc,
            description: desc,
            priority: priority,
            target_resolution_date: targetDate,
        });
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <aside className="modal-panel" onClick={function (e) { e.stopPropagation(); }} role="dialog" aria-label="Request Modification">
                <header className="modal-panel__header">
                    <h2>Request Modification</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                </header>
                <form className="modal-panel__body" onSubmit={handleSubmit}>
                    <label className="form-field">
                        <span>Modification Type</span>
                        <select value={modType} onChange={function (e) { setModType(e.target.value); }}>
                            <option value="content_update">Content Update</option>
                            <option value="factual_correction">Factual Correction</option>
                            <option value="outdated_info">Outdated Information</option>
                            <option value="missing_section">Missing Section</option>
                            <option value="formatting_issue">Formatting Issue</option>
                            <option value="retire_article">Retire Article</option>
                        </select>
                    </label>
                    <label className="form-field">
                        <span>Short Description</span>
                        <input type="text" value={shortDesc} onChange={function (e) { setShortDesc(e.target.value); }} required />
                    </label>
                    <label className="form-field">
                        <span>Description</span>
                        <textarea rows={4} value={desc} onChange={function (e) { setDesc(e.target.value); }}></textarea>
                    </label>
                    <label className="form-field">
                        <span>Priority</span>
                        <select value={priority} onChange={function (e) { setPriority(e.target.value); }}>
                            <option value="1">1 - Critical</option>
                            <option value="2">2 - High</option>
                            <option value="3">3 - Moderate</option>
                            <option value="4">4 - Low</option>
                        </select>
                    </label>
                    <label className="form-field">
                        <span>Target Resolution Date</span>
                        <input type="date" value={targetDate} onChange={function (e) { setTargetDate(e.target.value); }} />
                    </label>
                    <div className="modal-panel__actions">
                        <button type="submit" className="btn-submit">Submit</button>
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </aside>
        </div>
    );
}
