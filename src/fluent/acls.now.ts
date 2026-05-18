import { Acl } from '@servicenow/sdk/core';
import {
    x_snc_knowledge_tr_reviewer,
    x_snc_knowledge_tr_admin,
} from './roles.now';

// ============================================================
// REVIEW RECORD ACLs
// ============================================================

// Read: no role required (scoped table is already protected by scope)
Acl({
    $id: Now.ID['acl_review_read'],
    type: 'record',
    table: 'x_snc_knowledge_tr_review_record',
    operation: 'read',
    roles: [],
    active: true,
    adminOverrides: true,
    description: 'Allow all authenticated users to read review records.',
});

// Write: reviewer and above
Acl({
    $id: Now.ID['acl_review_write'],
    type: 'record',
    table: 'x_snc_knowledge_tr_review_record',
    operation: 'write',
    roles: [x_snc_knowledge_tr_reviewer],
    active: true,
    adminOverrides: true,
    description: 'Allow reviewers (and above) to modify review records.',
});

// Create: admin only (system creates via scheduled job)
Acl({
    $id: Now.ID['acl_review_create'],
    type: 'record',
    table: 'x_snc_knowledge_tr_review_record',
    operation: 'create',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins (and system scheduled jobs) can create review records.',
});

// Delete: admin only
Acl({
    $id: Now.ID['acl_review_delete'],
    type: 'record',
    table: 'x_snc_knowledge_tr_review_record',
    operation: 'delete',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can delete review records.',
});

// Field-level: review_notes write restricted to reviewer+
Acl({
    $id: Now.ID['acl_review_notes_write'],
    type: 'record',
    table: 'x_snc_knowledge_tr_review_record',
    field: 'review_notes',
    operation: 'write',
    roles: [x_snc_knowledge_tr_reviewer],
    active: true,
    adminOverrides: true,
    description: 'Only reviewers and above can write review notes.',
});

// ============================================================
// MODIFICATION REQUEST ACLs
// ============================================================

// Read: no role required
Acl({
    $id: Now.ID['acl_mod_read'],
    type: 'record',
    table: 'x_snc_knowledge_tr_modification_request',
    operation: 'read',
    roles: [],
    active: true,
    adminOverrides: true,
    description: 'Allow all authenticated users to read modification requests.',
});

// Create: reviewer and above
Acl({
    $id: Now.ID['acl_mod_create'],
    type: 'record',
    table: 'x_snc_knowledge_tr_modification_request',
    operation: 'create',
    roles: [x_snc_knowledge_tr_reviewer],
    active: true,
    adminOverrides: true,
    description: 'Allow reviewers (and above) to create modification requests.',
});

// Write: reviewer and above (coordinators can write all)
Acl({
    $id: Now.ID['acl_mod_write'],
    type: 'record',
    table: 'x_snc_knowledge_tr_modification_request',
    operation: 'write',
    roles: [x_snc_knowledge_tr_reviewer],
    active: true,
    adminOverrides: true,
    description: 'Allow reviewers to modify their own modification requests, coordinators can modify all.',
});

// Delete: admin only
Acl({
    $id: Now.ID['acl_mod_delete'],
    type: 'record',
    table: 'x_snc_knowledge_tr_modification_request',
    operation: 'delete',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can delete modification requests.',
});

// ============================================================
// SOURCE EXCLUSION ACLs
// ============================================================

// Read: no role required
Acl({
    $id: Now.ID['acl_exclusion_read'],
    type: 'record',
    table: 'x_snc_knowledge_tr_source_exclusion',
    operation: 'read',
    roles: [],
    active: true,
    adminOverrides: true,
    description: 'Allow all authenticated users to view source exclusion configurations.',
});

// Create: admin only
Acl({
    $id: Now.ID['acl_exclusion_create'],
    type: 'record',
    table: 'x_snc_knowledge_tr_source_exclusion',
    operation: 'create',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can create source exclusion records.',
});

// Write: admin only
Acl({
    $id: Now.ID['acl_exclusion_write'],
    type: 'record',
    table: 'x_snc_knowledge_tr_source_exclusion',
    operation: 'write',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can modify source exclusion records.',
});

// Delete: admin only
Acl({
    $id: Now.ID['acl_exclusion_delete'],
    type: 'record',
    table: 'x_snc_knowledge_tr_source_exclusion',
    operation: 'delete',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can delete source exclusion records.',
});

// ============================================================
// ARTICLE LIST ACLs
// ============================================================

// Read: no role required
Acl({
    $id: Now.ID['acl_article_list_read'],
    type: 'record',
    table: 'x_snc_knowledge_tr_article_list',
    operation: 'read',
    roles: [],
    active: true,
    adminOverrides: true,
    description: 'Allow all authenticated users to read article list records.',
});

// Create: admin only (system creates via sync)
Acl({
    $id: Now.ID['acl_article_list_create'],
    type: 'record',
    table: 'x_snc_knowledge_tr_article_list',
    operation: 'create',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins (and system sync) can create article list records.',
});

// Write: admin only
Acl({
    $id: Now.ID['acl_article_list_write'],
    type: 'record',
    table: 'x_snc_knowledge_tr_article_list',
    operation: 'write',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can modify article list records.',
});

// Delete: admin only
Acl({
    $id: Now.ID['acl_article_list_delete'],
    type: 'record',
    table: 'x_snc_knowledge_tr_article_list',
    operation: 'delete',
    roles: [x_snc_knowledge_tr_admin],
    active: true,
    adminOverrides: true,
    description: 'Only admins can delete article list records.',
});
