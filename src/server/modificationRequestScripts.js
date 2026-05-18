import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide';

/**
 * After Insert: When a modification request is created, update the linked
 * review record's status to 'modification_requested'.
 */
export function updateReviewStatusOnCreation(current) {
    if (!current.review_record) {
        return;
    }
    var reviewGr = new GlideRecord('x_snc_knowledge_tr_review_record');
    if (reviewGr.get(current.review_record.toString())) {
        reviewGr.review_status = 'modification_requested';
        reviewGr.update();
        gs.info('KTM: Review record ' + reviewGr.sys_id + ' status set to modification_requested.');
    }
}

/**
 * After Update: When state changes to 'resolved', set linked review record
 * to 're_review_needed' so the reviewer can re-verify the article.
 */
export function setReReviewOnResolution(current, previous) {
    if (current.state.toString() === '3' && previous.state.toString() !== '3') {
        if (!current.review_record) {
            return;
        }
        var reviewGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        if (reviewGr.get(current.review_record.toString())) {
            reviewGr.review_status = 're_review_needed';
            reviewGr.update();
            gs.info('KTM: Modification request resolved. Review record ' + reviewGr.sys_id + ' set to re_review_needed.');
        }
    }
}

/**
 * Before Update: Require resolution_summary when state is changing to 'resolved'.
 */
export function requireResolutionSummary(current, previous) {
    if (current.state.toString() === '3' && previous.state.toString() !== '3') {
        if (!current.resolution_summary || current.resolution_summary.toString().trim() === '') {
            gs.addErrorMessage('A resolution summary is required when resolving a modification request.');
            current.setAbortAction(true);
        }
    }
}

/**
 * After Update: When a modification request is resolved (state → 3),
 * create an approval record (sysapproval_approver) targeting the KTM
 * responsible so they can validate the completed work.
 *
 * The approver is currently set to System Administrator (admin).
 * This can be changed later to use a system property or role-based lookup.
 */
export function createApprovalOnResolution(current, previous) {
    // Only fire when state transitions TO resolved
    if (current.state.toString() !== '3' || previous.state.toString() === '3') {
        return;
    }

    // System Administrator sys_id
    var approverSysId = '6816f79cc0a8016401c5a33be04be441';

    // Check if an approval already exists for this document to avoid duplicates
    var existGr = new GlideRecord('sysapproval_approver');
    existGr.addQuery('document_id', current.sys_id.toString());
    existGr.addQuery('source_table', 'x_snc_knowledge_tr_modification_request');
    existGr.addQuery('state', 'requested');
    existGr.setLimit(1);
    existGr.query();
    if (existGr.next()) {
        gs.info('KTM: Approval already pending for modification request ' + current.number + '. Skipping.');
        return;
    }

    // Build a descriptive approval message
    var modNumber = current.number.toString();
    var modDesc = current.short_description.toString() || '(Aucune description)';
    var modType = current.modification_type.toString() || '';
    var resolvedBy = gs.getUserDisplayName();

    // Create the approval record
    var approvalGr = new GlideRecord('sysapproval_approver');
    approvalGr.initialize();
    approvalGr.setValue('source_table', 'x_snc_knowledge_tr_modification_request');
    approvalGr.setValue('document_id', current.sys_id.toString());
    approvalGr.setValue('approver', approverSysId);
    approvalGr.setValue('state', 'requested');
    approvalGr.setValue('comments',
        'Demande d\'approbation KTM — La tâche ' + modNumber +
        ' (' + modType + ') a été résolue par ' + resolvedBy +
        '.\n\nDescription : ' + modDesc +
        '\n\nRésumé de résolution : ' + (current.resolution_summary.toString() || '—')
    );
    var approvalSysId = approvalGr.insert();

    if (approvalSysId) {
        gs.info('KTM: Approval record ' + approvalSysId + ' created for modification request ' + modNumber + ' targeting System Administrator.');
    } else {
        gs.warn('KTM: Failed to create approval record for modification request ' + modNumber + '.');
    }
}
