import React from 'react';
import './StatusPill.css';

const STATUS_MAP = {
    pending_review: { label: 'Pending Review', className: 'pill--warning' },
    in_review: { label: 'In Review', className: 'pill--warning' },
    approved: { label: 'Approved', className: 'pill--success' },
    modification_requested: { label: 'Modification Requested', className: 'pill--error' },
    re_review_needed: { label: 'Re-Review Needed', className: 'pill--warning' },
    fresh: { label: 'Fresh', className: 'pill--success' },
    aging: { label: 'Aging', className: 'pill--warning' },
    stale: { label: 'Stale', className: 'pill--muted' },
    draft: { label: 'Draft', className: 'pill--muted' },
    submitted: { label: 'Submitted', className: 'pill--warning' },
    in_progress: { label: 'In Progress', className: 'pill--warning' },
    resolved: { label: 'Resolved', className: 'pill--success' },
    rejected: { label: 'Rejected', className: 'pill--error' },
    cancelled: { label: 'Cancelled', className: 'pill--muted' },
};

export default function StatusPill({ status }) {
    const config = STATUS_MAP[status] || { label: status || 'Unknown', className: 'pill--muted' };
    return <span className={'status-pill ' + config.className}>{config.label}</span>;
}
