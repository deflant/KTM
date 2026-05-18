import { gs, GlideRecord } from '@servicenow/glide';

/**
 * Before Update: If content_hash has changed, reset review status to re_review_needed
 * and clear last_reviewed_on to trigger a new review cycle.
 */
export function setReReviewOnContentChange(current, previous) {
    if (current.content_hash.toString() !== previous.content_hash.toString() &&
        current.content_hash.toString() !== '') {
        current.review_status = 're_review_needed';
        current.last_reviewed_on = '';
        gs.info('KTM: Content hash changed for review record ' + current.sys_id + '. Re-review triggered.');
    }
}

/**
 * Before Insert: Auto-populate source metadata fields from the linked kb_knowledge article.
 * Reads the article's source field and maps it to connector name/type.
 */
export function autoPopulateSourceMetadata(current) {
    if (!current.article) {
        return;
    }
    var articleGr = new GlideRecord('kb_knowledge');
    if (articleGr.get(current.article.toString())) {
        // Populate source connector name from the article source field
        if (articleGr.isValidField('source')) {
            current.source_connector_name = articleGr.getValue('source') || '';
        }
        // Populate last external update from the article's sys_updated_on
        current.last_external_update = articleGr.getValue('sys_updated_on') || '';
        // Attempt to detect connector type from source name
        var sourceName = (current.source_connector_name || '').toString().toLowerCase();
        if (sourceName.indexOf('confluence') > -1) {
            current.source_connector_type = 'confluence';
        } else if (sourceName.indexOf('sharepoint') > -1) {
            current.source_connector_type = 'sharepoint';
        } else if (sourceName.indexOf('google') > -1) {
            current.source_connector_type = 'google_drive';
        } else if (sourceName !== '') {
            current.source_connector_type = 'other';
        }
        gs.info('KTM: Auto-populated source metadata for article ' + current.article);
    }
}

/**
 * Before Update: Prevent approval without review notes.
 * If review_status is changing to 'approved', require that review_notes is not empty.
 */
export function preventApprovalWithoutNotes(current, previous) {
    if (current.review_status.toString() === 'approved' &&
        previous.review_status.toString() !== 'approved') {
        if (!current.review_notes || current.review_notes.toString().trim() === '') {
            gs.addErrorMessage('Review notes are required when approving an article.');
            current.setAbortAction(true);
        }
    }
}
