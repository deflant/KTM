import { Property } from '@servicenow/sdk/core';
import { x_snc_knowledge_tr_admin } from './roles.now';

// --- Freshness Thresholds ---

Property({
    $id: Now.ID['prop_fresh_threshold'],
    name: 'x_snc_knowledge_tr.freshness.fresh_threshold',
    type: 'integer',
    value: 30,
    description: 'Maximum number of days since last review or update for an article to be considered "Fresh". Articles within this threshold display a green Fresh badge. Default: 30 days.',
    roles: {
        read: ['x_snc_knowledge_tr.consumer'],
        write: [x_snc_knowledge_tr_admin],
    },
    isPrivate: false,
    ignoreCache: false,
});

Property({
    $id: Now.ID['prop_stale_threshold'],
    name: 'x_snc_knowledge_tr.freshness.stale_threshold',
    type: 'integer',
    value: 90,
    description: 'Number of days since last review or update after which an article is considered "Stale". Articles exceeding this threshold display a grey Stale badge. Articles between fresh and stale thresholds are "Aging". Default: 90 days.',
    roles: {
        read: ['x_snc_knowledge_tr.consumer'],
        write: [x_snc_knowledge_tr_admin],
    },
    isPrivate: false,
    ignoreCache: false,
});

// --- SLA Targets ---

Property({
    $id: Now.ID['prop_sla_review_days'],
    name: 'x_snc_knowledge_tr.sla.review_days',
    type: 'integer',
    value: 5,
    description: 'SLA target in business days for initial review of a new or updated article (from Pending Review to Approved). Default: 5 business days.',
    roles: {
        read: ['x_snc_knowledge_tr.consumer'],
        write: [x_snc_knowledge_tr_admin],
    },
    isPrivate: false,
    ignoreCache: false,
});

Property({
    $id: Now.ID['prop_sla_modification_days'],
    name: 'x_snc_knowledge_tr.sla.modification_days',
    type: 'integer',
    value: 10,
    description: 'SLA target in business days for resolving a modification request (from Submitted to Resolved). Default: 10 business days.',
    roles: {
        read: ['x_snc_knowledge_tr.consumer'],
        write: [x_snc_knowledge_tr_admin],
    },
    isPrivate: false,
    ignoreCache: false,
});

Property({
    $id: Now.ID['prop_sla_re_review_days'],
    name: 'x_snc_knowledge_tr.sla.re_review_days',
    type: 'integer',
    value: 3,
    description: 'SLA target in business days for re-reviewing an article after a modification request is resolved. Default: 3 business days.',
    roles: {
        read: ['x_snc_knowledge_tr.consumer'],
        write: [x_snc_knowledge_tr_admin],
    },
    isPrivate: false,
    ignoreCache: false,
});
