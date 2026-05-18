import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide';

/**
 * After Insert on review_record: automatically create a corresponding
 * entry in the article_list table so the Liste des articles stays in sync.
 *
 * Handles both external connector docs (external_doc_id populated)
 * and internal KB articles (article reference populated).
 */
export function createArticleListEntry(current) {
    // Build title: external_doc_title → display_title → kb short_description
    var title = current.getValue('external_doc_title')
        || current.getValue('display_title')
        || '';

    var url = current.getValue('external_doc_url') || '';
    var externalDocId = current.getValue('external_doc_id') || '';

    // For KB-linked articles without external_doc_id, use the article sys_id
    var articleRef = current.getValue('article');
    if (!externalDocId && articleRef) {
        externalDocId = 'kb_' + articleRef;
        // Fetch KB article details for title and URL
        var kbGr = new GlideRecord('kb_knowledge');
        if (kbGr.get(articleRef)) {
            if (!title) {
                title = kbGr.getValue('short_description') || '(Untitled)';
            }
            if (!url) {
                url = kbGr.getValue('source') || '';
            }
        }
    }

    if (!title) title = '(Untitled)';
    if (!externalDocId) externalDocId = 'rr_' + current.getValue('sys_id');

    // Check for duplicates
    var existGr = new GlideRecord('x_snc_knowledge_tr_article_list');
    existGr.addQuery('external_doc_id', externalDocId);
    existGr.setLimit(1);
    existGr.query();
    if (existGr.next()) return;

    // Insert
    var alGr = new GlideRecord('x_snc_knowledge_tr_article_list');
    alGr.initialize();
    alGr.setValue('article_title', title);
    alGr.setValue('article_url', url);
    alGr.setValue('external_doc_id', externalDocId);
    alGr.setValue('source_connector_name', current.getValue('source_connector_name') || '');
    alGr.setValue('source_connector_type', current.getValue('source_connector_type') || '');
    alGr.setValue('review_record', current.getValue('sys_id'));
    alGr.setValue('active', 'true');
    var now = new GlideDateTime();
    alGr.setValue('synced_on', now);
    var extUpdate = current.getValue('last_external_update');
    if (extUpdate) alGr.setValue('last_external_update', extUpdate);
    alGr.insert();
}
