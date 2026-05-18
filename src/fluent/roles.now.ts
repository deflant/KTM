import { Role } from '@servicenow/sdk/core';

// Knowledge Consumer — read-only access to review records and article content
export const x_snc_knowledge_tr_consumer = Role({
    name: 'x_snc_knowledge_tr.consumer',
    description: 'Read-only access to knowledge review records, article content, and modification request status. Cannot approve or create modification requests.',
    canDelegate: true,
    grantable: true,
});

// Knowledge Reviewer — can approve articles, request modifications, add review notes
export const x_snc_knowledge_tr_reviewer = Role({
    name: 'x_snc_knowledge_tr.reviewer',
    description: 'Subject-matter expert who verifies, approves, or flags articles for modification. Can change review status, create modification requests, and add review notes.',
    canDelegate: true,
    grantable: true,
    containsRoles: [x_snc_knowledge_tr_consumer],
});

// Knowledge Coordinator — manages review assignments, monitors SLAs, uses analytics
export const x_snc_knowledge_tr_coordinator = Role({
    name: 'x_snc_knowledge_tr.coordinator',
    description: 'Manages review assignments, bulk-assigns articles, monitors SLAs, views all analytics, and receives digest notifications for knowledge hygiene campaigns.',
    canDelegate: true,
    grantable: true,
    containsRoles: [x_snc_knowledge_tr_reviewer],
});

// App Admin — configures excluded sources, manages roles, tunes SLA targets
export const x_snc_knowledge_tr_admin = Role({
    name: 'x_snc_knowledge_tr.admin',
    description: 'Full application administrator. Configures source exclusions, manages system properties (freshness thresholds, SLA targets), and manages role assignments.',
    canDelegate: true,
    grantable: true,
    scopedAdmin: true,
    containsRoles: [x_snc_knowledge_tr_coordinator],
});
