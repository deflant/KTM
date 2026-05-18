import { BusinessRule } from '@servicenow/sdk/core';
import {
    setReReviewOnContentChange,
    autoPopulateSourceMetadata,
    preventApprovalWithoutNotes,
} from '../server/reviewRecordScripts.js';
import {
    updateReviewStatusOnCreation,
    setReReviewOnResolution,
    requireResolutionSummary,
    createApprovalOnResolution,
} from '../server/modificationRequestScripts.js';
import {
    deactivateReviewRecordsForExcludedSource,
    reactivateReviewRecordsOnExclusionRemoval,
} from '../server/sourceExclusionScripts.js';

// ============================================================
// REVIEW RECORD BUSINESS RULES
// ============================================================

/**
 * Before Update: If content_hash changes, set review_status to re_review_needed
 * and clear last_reviewed_on to trigger a new review cycle.
 */
BusinessRule({
    $id: Now.ID['br_re_review_content_change'],
    name: 'KTM - Set Re-Review on Content Change',
    table: 'x_snc_knowledge_tr_review_record',
    when: 'before',
    action: ['update'],
    order: 100,
    active: true,
    script: setReReviewOnContentChange,
    description: 'When content_hash changes on a review record, reset review status to re_review_needed and clear last_reviewed_on.',
});

/**
 * Before Insert: Read the linked kb_knowledge record and populate
 * source_connector_name, source_connector_type, and last_external_update.
 */
BusinessRule({
    $id: Now.ID['br_auto_populate_source'],
    name: 'KTM - Auto-populate Source Metadata',
    table: 'x_snc_knowledge_tr_review_record',
    when: 'before',
    action: ['insert'],
    order: 50,
    active: true,
    script: autoPopulateSourceMetadata,
    description: 'Auto-populate source connector metadata from the linked kb_knowledge article on review record creation.',
});

/**
 * Before Update: Prevent approval if review_notes is empty.
 */
BusinessRule({
    $id: Now.ID['br_prevent_approval_no_notes'],
    name: 'KTM - Prevent Approval Without Notes',
    table: 'x_snc_knowledge_tr_review_record',
    when: 'before',
    action: ['update'],
    order: 200,
    active: true,
    script: preventApprovalWithoutNotes,
    description: 'Prevent review_status from changing to approved unless review_notes has content.',
});



// ============================================================
// MODIFICATION REQUEST BUSINESS RULES
// ============================================================

/**
 * After Insert: Set the linked review record status to modification_requested.
 */
BusinessRule({
    $id: Now.ID['br_update_review_on_mod_create'],
    name: 'KTM - Update Review Status on Mod Request Creation',
    table: 'x_snc_knowledge_tr_modification_request',
    when: 'after',
    action: ['insert'],
    order: 100,
    active: true,
    script: updateReviewStatusOnCreation,
    description: 'When a modification request is created, update the linked review record status to modification_requested.',
});

/**
 * After Update: When state → resolved, set linked review record to re_review_needed.
 */
BusinessRule({
    $id: Now.ID['br_re_review_on_resolution'],
    name: 'KTM - Set Re-Review on Mod Request Resolution',
    table: 'x_snc_knowledge_tr_modification_request',
    when: 'after',
    action: ['update'],
    order: 100,
    active: true,
    script: setReReviewOnResolution,
    description: 'When a modification request is resolved, set the linked review record to re_review_needed for re-verification.',
});

/**
 * Before Update: Require resolution_summary when resolving.
 */
BusinessRule({
    $id: Now.ID['br_require_resolution_summary'],
    name: 'KTM - Require Resolution Summary',
    table: 'x_snc_knowledge_tr_modification_request',
    when: 'before',
    action: ['update'],
    order: 200,
    active: true,
    script: requireResolutionSummary,
    description: 'Require a resolution summary when state is changing to resolved.',
});

/**
 * After Update: When state → resolved, create an approval record
 * (sysapproval_approver) targeting the KTM responsible (System Administrator)
 * so they can validate the completed work before final closure.
 */
BusinessRule({
    $id: Now.ID['br_create_approval_on_resolution'],
    name: 'KTM - Create Approval on Resolution',
    table: 'x_snc_knowledge_tr_modification_request',
    when: 'after',
    action: ['update'],
    order: 150,
    active: true,
    script: createApprovalOnResolution,
    description: 'When a modification request is resolved, create an approval record for the KTM responsible to validate the completed work.',
});

// ============================================================
// SOURCE EXCLUSION BUSINESS RULES
// ============================================================

/**
 * After Insert/Update: When exclusion is active, deactivate matching review records.
 */
BusinessRule({
    $id: Now.ID['br_deactivate_excluded_reviews'],
    name: 'KTM - Deactivate Reviews for Excluded Source',
    table: 'x_snc_knowledge_tr_source_exclusion',
    when: 'after',
    action: ['insert', 'update'],
    order: 100,
    active: true,
    script: deactivateReviewRecordsForExcludedSource,
    description: 'When a source exclusion is added or reactivated, deactivate all review records matching that source connector name.',
});

/**
 * After Update: When exclusion is deactivated, reactivate matching review records.
 */
BusinessRule({
    $id: Now.ID['br_reactivate_on_exclusion_removal'],
    name: 'KTM - Reactivate Reviews on Exclusion Removal',
    table: 'x_snc_knowledge_tr_source_exclusion',
    when: 'after',
    action: ['update'],
    order: 100,
    active: true,
    script: reactivateReviewRecordsOnExclusionRemoval,
    description: 'When a source exclusion is deactivated, reactivate matching review records.',
});
