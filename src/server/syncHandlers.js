import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide';

/**
 * POST /sync-connectors — Stub endpoint. The actual sync is done client-side
 * using AI Search API. This handler just returns a message.
 */
export function syncConnectors(request, response) {
    response.setStatus(200);
    response.setBody({
        result: {
            message: 'Use client-side sync via AI Search API.',
        }
    });
}

/**
 * GET /connector-host?type=confluence&titles=title1|||title2
 * Looks up the base host URL for an external content connector,
 * and optionally resolves direct page URLs via the Confluence REST API.
 */
export function getConnectorHost(request, response) {
    var params = request.queryParams;
    var connType = params.type || 'confluence';
    var titlesRaw = params.titles || '';
    if (Array.isArray(titlesRaw)) titlesRaw = titlesRaw[0] || '';
    titlesRaw = String(titlesRaw);

    var host = '';
    var debug = [];
    var directUrls = {};

    try {
        // Find connector configuration
        if (connType === 'confluence') {
            var cfgGr = new GlideRecord('sn_ext_conn_cc_confluence_cloud_configuration');
            cfgGr.addQuery('active', true);
            cfgGr.setLimit(1);
            cfgGr.query();
            if (cfgGr.next()) {
                var aliasId = cfgGr.getValue('connection_credential_alias');
                var connGr = new GlideRecord('sys_connection');
                connGr.addQuery('connection_alias', aliasId);
                connGr.addQuery('active', true);
                connGr.setLimit(1);
                connGr.query();
                if (connGr.next()) {
                    host = connGr.getValue('host') || '';
                }

                // Return alias ID so the client can call the Script Include via GlideAjax
                var titles = titlesRaw ? titlesRaw.split('|||') : [];
                debug.push('titles_count=' + titles.length);
                debug.push('alias_id=' + aliasId);
            }
        }
    } catch (e) {
        debug.push('top_err=' + String(e).substring(0, 100));
    }

    response.setStatus(200);
    response.setBody({
        result: {
            host: host,
            directUrls: directUrls,
            debug: debug,
        }
    });
}

/**
 * POST /backfill-article-list — Scans all existing review records and creates
 * missing entries in the article_list table for records that predate the feature.
 */
export function backfillArticleList(request, response) {
    var created = 0;
    var skipped = 0;

    var rrGr = new GlideRecord('x_snc_knowledge_tr_review_record');
    rrGr.addQuery('active', true);
    rrGr.query();

    while (rrGr.next()) {
        var externalDocId = rrGr.getValue('external_doc_id') || '';
        var articleRef = rrGr.getValue('article') || '';

        // Build a unique key for deduplication
        var docKey = externalDocId;
        if (!docKey && articleRef) docKey = 'kb_' + articleRef;
        if (!docKey) docKey = 'rr_' + rrGr.getValue('sys_id');

        // Check if article list entry already exists
        var existGr = new GlideRecord('x_snc_knowledge_tr_article_list');
        existGr.addQuery('external_doc_id', docKey);
        existGr.setLimit(1);
        existGr.query();
        if (existGr.next()) { skipped++; continue; }

        // Build title and URL
        var title = rrGr.getValue('external_doc_title')
            || rrGr.getValue('display_title')
            || '';
        var url = rrGr.getValue('external_doc_url') || '';

        // For KB-linked articles, fetch from kb_knowledge
        if (articleRef && (!title || !url)) {
            var kbGr = new GlideRecord('kb_knowledge');
            if (kbGr.get(articleRef)) {
                if (!title) title = kbGr.getValue('short_description') || '';
                if (!url) url = kbGr.getValue('source') || '';
            }
        }

        if (!title) title = '(Untitled)';

        // Insert into article_list
        var alGr = new GlideRecord('x_snc_knowledge_tr_article_list');
        alGr.initialize();
        alGr.setValue('article_title', title);
        alGr.setValue('article_url', url);
        alGr.setValue('external_doc_id', docKey);
        alGr.setValue('source_connector_name', rrGr.getValue('source_connector_name') || '');
        alGr.setValue('source_connector_type', rrGr.getValue('source_connector_type') || '');
        alGr.setValue('review_record', rrGr.getValue('sys_id'));
        alGr.setValue('active', 'true');
        var now = new GlideDateTime();
        alGr.setValue('synced_on', now);
        var extUpdate = rrGr.getValue('last_external_update');
        if (extUpdate) alGr.setValue('last_external_update', extUpdate);
        alGr.insert();
        created++;
    }

    response.setStatus(200);
    response.setBody({
        result: {
            records_created: created,
            records_skipped: skipped,
            total_processed: created + skipped,
        }
    });
}

/**
 * POST /sync-kb-articles — Scans published kb_knowledge articles and creates
 * review records + article list entries for each one.
 * Only processes active, published articles. Uses 'kb_' + sys_id as the
 * external_doc_id to deduplicate against existing entries.
 */
export function syncKBArticles(request, response) {
    var created = 0;
    var skipped = 0;
    var articlesCreated = 0;
    var totalScanned = 0;

    // Query all active, published KB articles
    var kbGr = new GlideRecord('kb_knowledge');
    kbGr.addQuery('workflow_state', 'published');
    kbGr.addQuery('active', true);
    kbGr.query();

    while (kbGr.next()) {
        totalScanned++;
        var kbSysId = kbGr.getValue('sys_id');
        var docKey = 'kb_' + kbSysId;
        var title = kbGr.getValue('short_description') || '(Sans titre)';
        var kbNumber = kbGr.getValue('number') || '';
        var kbBaseName = kbGr.getDisplayValue('kb_knowledge_base') || '';

        // Build URL to view the KB article
        var articleUrl = '';
        if (kbNumber) {
            articleUrl = '/kb_view.do?sysparm_article=' + kbNumber;
        }

        // --- Check if review record already exists for this KB article ---
        var existGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        existGr.addQuery('external_doc_id', docKey);
        existGr.setLimit(1);
        existGr.query();
        if (existGr.next()) {
            skipped++;
            continue;
        }

        // Also check by the article reference field
        var existGr2 = new GlideRecord('x_snc_knowledge_tr_review_record');
        existGr2.addQuery('article', kbSysId);
        existGr2.setLimit(1);
        existGr2.query();
        if (existGr2.next()) {
            skipped++;
            continue;
        }

        // --- Create review record ---
        var rrGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        rrGr.initialize();
        rrGr.setValue('article', kbSysId);
        rrGr.setValue('external_doc_id', docKey);
        rrGr.setValue('external_doc_title', title);
        rrGr.setValue('external_doc_url', articleUrl);
        rrGr.setValue('display_title', title);
        rrGr.setValue('review_status', 'pending_review');
        rrGr.setValue('freshness_score', 'fresh');
        rrGr.setValue('source_connector_name', kbBaseName || 'ServiceNow KB');
        rrGr.setValue('source_connector_type', 'servicenow_kb');
        rrGr.setValue('active', 'true');
        var updatedOn = kbGr.getValue('sys_updated_on');
        if (updatedOn) rrGr.setValue('last_external_update', updatedOn);
        var reviewSysId = rrGr.insert();
        created++;

        // --- Also insert into Article List table ---
        var alExistGr = new GlideRecord('x_snc_knowledge_tr_article_list');
        alExistGr.addQuery('external_doc_id', docKey);
        alExistGr.setLimit(1);
        alExistGr.query();

        if (!alExistGr.next()) {
            var alGr = new GlideRecord('x_snc_knowledge_tr_article_list');
            alGr.initialize();
            alGr.setValue('article_title', title);
            alGr.setValue('article_url', articleUrl);
            alGr.setValue('external_doc_id', docKey);
            alGr.setValue('source_connector_name', kbBaseName || 'ServiceNow KB');
            alGr.setValue('source_connector_type', 'servicenow_kb');
            alGr.setValue('review_record', reviewSysId);
            alGr.setValue('active', 'true');
            var now = new GlideDateTime();
            alGr.setValue('synced_on', now);
            if (updatedOn) alGr.setValue('last_external_update', updatedOn);
            alGr.insert();
            articlesCreated++;
        }
    }

    response.setStatus(200);
    response.setBody({
        result: {
            total_scanned: totalScanned,
            records_created: created,
            records_skipped: skipped,
            articles_created: articlesCreated,
        }
    });
}

/**
 * POST /sync-external-docs — Receives external document data from the client
 * and creates review records + article list entries. Body is read from dataString.
 */
export function syncExternalDocs(request, response) {
    var documents = [];
    try {
        var raw = request.body.dataString;
        if (raw) {
            var parsed = JSON.parse(raw);
            documents = parsed.documents || [];
        }
    } catch (e) {
        try {
            var bd = request.body.data;
            if (bd && bd.documents) documents = bd.documents;
        } catch (e2) { /* ignore */ }
    }

    var created = 0;
    var skipped = 0;
    var articlesCreated = 0;

    for (var i = 0; i < documents.length; i++) {
        var doc = documents[i];
        if (!doc.id) { skipped++; continue; }

        // --- Check if review record already exists ---
        var existGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        existGr.addQuery('external_doc_id', doc.id);
        existGr.setLimit(1);
        existGr.query();
        if (existGr.next()) { skipped++; continue; }

        // --- Create review record ---
        var rrGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        rrGr.initialize();
        rrGr.setValue('external_doc_id', doc.id);
        rrGr.setValue('external_doc_title', doc.title || '');
        rrGr.setValue('external_doc_url', doc.url || '');
        rrGr.setValue('external_doc_table', doc.table || '');
        rrGr.setValue('display_title', doc.title || '(Untitled)');
        rrGr.setValue('review_status', 'pending_review');
        rrGr.setValue('freshness_score', 'fresh');
        rrGr.setValue('source_connector_name', doc.connector_name || 'External');
        rrGr.setValue('source_connector_type', doc.connector_type || 'web_crawler');
        rrGr.setValue('active', 'true');
        if (doc.modified_on) rrGr.setValue('last_external_update', doc.modified_on);
        var reviewSysId = rrGr.insert();
        created++;

        // --- Also insert into Article List table ---
        var articleTitle = doc.title || '(Untitled)';
        var articleUrl = doc.url || '';

        var alExistGr = new GlideRecord('x_snc_knowledge_tr_article_list');
        alExistGr.addQuery('external_doc_id', doc.id);
        alExistGr.setLimit(1);
        alExistGr.query();

        if (!alExistGr.next()) {
            var alGr = new GlideRecord('x_snc_knowledge_tr_article_list');
            alGr.initialize();
            alGr.setValue('article_title', articleTitle);
            alGr.setValue('article_url', articleUrl);
            alGr.setValue('external_doc_id', doc.id);
            alGr.setValue('source_connector_name', doc.connector_name || 'External');
            alGr.setValue('source_connector_type', doc.connector_type || 'web_crawler');
            alGr.setValue('review_record', reviewSysId);
            alGr.setValue('active', 'true');
            var now = new GlideDateTime();
            alGr.setValue('synced_on', now);
            if (doc.modified_on) alGr.setValue('last_external_update', doc.modified_on);
            alGr.insert();
            articlesCreated++;
        }
    }

    response.setStatus(200);
    response.setBody({
        result: {
            documents_received: documents.length,
            records_created: created,
            records_skipped: skipped,
            articles_created: articlesCreated,
        }
    });
}
