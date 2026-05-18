import { gs, GlideRecord } from '@servicenow/glide';

/**
 * After Insert/Update: When a new source exclusion is added or reactivated,
 * deactivate all review records matching that source name.
 */
export function deactivateReviewRecordsForExcludedSource(current) {
    if (current.active.toString() === 'true' || current.active.toString() === '1') {
        var reviewGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        reviewGr.addQuery('source_connector_name', current.source_name.toString());
        reviewGr.addQuery('active', true);
        reviewGr.query();
        var count = 0;
        while (reviewGr.next()) {
            reviewGr.active = false;
            reviewGr.update();
            count++;
        }
        if (count > 0) {
            gs.info('KTM: Deactivated ' + count + ' review records for excluded source: ' + current.source_name);
        }
    }
}

/**
 * After Update: When an exclusion is deactivated (active goes to false),
 * reactivate matching review records.
 */
export function reactivateReviewRecordsOnExclusionRemoval(current, previous) {
    if ((current.active.toString() === 'false' || current.active.toString() === '0') &&
        (previous.active.toString() === 'true' || previous.active.toString() === '1')) {
        var reviewGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        reviewGr.addQuery('source_connector_name', current.source_name.toString());
        reviewGr.addQuery('active', false);
        reviewGr.query();
        var count = 0;
        while (reviewGr.next()) {
            reviewGr.active = true;
            reviewGr.update();
            count++;
        }
        if (count > 0) {
            gs.info('KTM: Reactivated ' + count + ' review records for source: ' + current.source_name);
        }
    }
}
