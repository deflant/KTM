import { gs, GlideRecord, GlideAggregate, GlideDateTime, GlideDuration } from '@servicenow/glide';
import { RESTAPIRequest, RESTAPIResponse } from '@servicenow/glide/sn_ws_int';

/**
 * GET /review-records — Fetch review records with filtering, sorting, pagination.
 * Query params: status, freshness, source, kb, reviewer, page, limit, sort, order
 */
export function getReviewRecords(request, response) {
    var params = request.queryParams;
    var page = parseInt(params.page) || 1;
    var limit = parseInt(params.limit) || 25;
    var offset = (page - 1) * limit;

    var gr = new GlideRecord('x_snc_knowledge_tr_review_record');
    gr.addQuery('active', true);

    if (params.status) gr.addQuery('review_status', params.status);
    if (params.freshness) gr.addQuery('freshness_score', params.freshness);
    if (params.source) gr.addQuery('source_connector_name', params.source);
    if (params.reviewer) gr.addQuery('assigned_reviewer', params.reviewer);

    gr.orderByDesc('days_since_last_update');
    gr.chooseWindow(offset, offset + limit);
    gr.query();

    var records = [];
    while (gr.next()) {
        var articleTitle = '';
        var kbName = '';
        var extDocTitle = gr.getValue('external_doc_title') || '';
        var extDocUrl = gr.getValue('external_doc_url') || '';
        var displayTitle = gr.getValue('display_title') || '';

        if (gr.article) {
            var artGr = new GlideRecord('kb_knowledge');
            if (artGr.get(gr.article.toString())) {
                articleTitle = artGr.getDisplayValue('short_description') || artGr.getValue('short_description') || '';
                if (artGr.kb_knowledge_base) {
                    kbName = artGr.getDisplayValue('kb_knowledge_base') || '';
                }
            }
        }

        // Use display_title, then article title, then external doc title
        var title = displayTitle || articleTitle || extDocTitle || '(Untitled)';

        records.push({
            sys_id: gr.getValue('sys_id'),
            article: gr.getValue('article'),
            article_title: title,
            knowledge_base: kbName,
            review_status: gr.getValue('review_status'),
            freshness_score: gr.getValue('freshness_score'),
            assigned_reviewer: gr.getDisplayValue('assigned_reviewer'),
            assigned_reviewer_id: gr.getValue('assigned_reviewer'),
            source_connector_name: gr.getValue('source_connector_name'),
            source_connector_type: gr.getValue('source_connector_type'),
            last_reviewed_on: gr.getValue('last_reviewed_on'),
            last_external_update: gr.getValue('last_external_update'),
            days_since_last_review: gr.getValue('days_since_last_review'),
            days_since_last_update: gr.getValue('days_since_last_update'),
            external_doc_id: gr.getValue('external_doc_id'),
            external_doc_title: extDocTitle,
            external_doc_url: extDocUrl,
            external_doc_table: gr.getValue('external_doc_table'),
        });
    }

    // Get total count
    var countGr = new GlideAggregate('x_snc_knowledge_tr_review_record');
    countGr.addQuery('active', true);
    if (params.status) countGr.addQuery('review_status', params.status);
    if (params.freshness) countGr.addQuery('freshness_score', params.freshness);
    if (params.source) countGr.addQuery('source_connector_name', params.source);
    if (params.reviewer) countGr.addQuery('assigned_reviewer', params.reviewer);
    countGr.addAggregate('COUNT');
    countGr.query();
    var total = 0;
    if (countGr.next()) {
        total = parseInt(countGr.getAggregate('COUNT'));
    }

    response.setStatus(200);
    response.setBody({
        result: records,
        total: total,
        page: page,
        limit: limit,
        pages: Math.ceil(total / limit),
    });
}

/**
 * GET /review-records/{id} — Fetch a single review record with article details.
 */
export function getReviewRecordDetail(request, response) {
    var id = request.pathParams.id;
    var gr = new GlideRecord('x_snc_knowledge_tr_review_record');
    if (!gr.get(id)) {
        response.setStatus(404);
        response.setBody({ error: 'Review record not found' });
        return;
    }

    var articleData = {};
    if (gr.article) {
        var artGr = new GlideRecord('kb_knowledge');
        if (artGr.get(gr.article.toString())) {
            articleData = {
                sys_id: artGr.getValue('sys_id'),
                short_description: artGr.getValue('short_description'),
                text: artGr.getValue('text'),
                author: artGr.getDisplayValue('author'),
                kb_knowledge_base: artGr.getDisplayValue('kb_knowledge_base'),
                kb_category: artGr.getDisplayValue('kb_category'),
                source_url: artGr.getValue('source') || '',
                sys_updated_on: artGr.getValue('sys_updated_on'),
            };
        }
    }

    response.setStatus(200);
    response.setBody({
        result: {
            sys_id: gr.getValue('sys_id'),
            display_title: gr.getValue('display_title'),
            external_doc_title: gr.getValue('external_doc_title'),
            external_doc_id: gr.getValue('external_doc_id'),
            external_doc_url: gr.getValue('external_doc_url'),
            external_doc_table: gr.getValue('external_doc_table'),
            review_status: gr.getValue('review_status'),
            freshness_score: gr.getValue('freshness_score'),
            assigned_reviewer: gr.getDisplayValue('assigned_reviewer'),
            assigned_reviewer_id: gr.getValue('assigned_reviewer'),
            reviewer_group: gr.getDisplayValue('reviewer_group'),
            source_connector_name: gr.getValue('source_connector_name'),
            source_connector_type: gr.getValue('source_connector_type'),
            last_reviewed_on: gr.getValue('last_reviewed_on'),
            last_reviewed_by: gr.getDisplayValue('last_reviewed_by'),
            last_external_update: gr.getValue('last_external_update'),
            review_notes: gr.getValue('review_notes'),
            days_since_last_review: gr.getValue('days_since_last_review'),
            days_since_last_update: gr.getValue('days_since_last_update'),
            active: gr.getValue('active'),
            article: articleData,
        },
    });
}

/**
 * PATCH /review-records/{id} — Update review record (approve, change status, assign reviewer, etc.)
 */
export function updateReviewRecord(request, response) {
    var id = request.pathParams.id;

    // Parse body — try dataString first, then data
    var body = {};
    try {
        var raw = request.body.dataString;
        if (raw) body = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (!body || Object.keys(body).length === 0) {
        try { body = request.body.data || {}; } catch (e2) { body = {}; }
    }

    var gr = new GlideRecord('x_snc_knowledge_tr_review_record');
    if (!gr.get(id)) {
        response.setStatus(404);
        response.setBody({ error: 'Review record not found' });
        return;
    }

    if (body.review_status) gr.setValue('review_status', body.review_status);
    if (body.assigned_reviewer) gr.setValue('assigned_reviewer', body.assigned_reviewer);
    if (body.reviewer_group) gr.setValue('reviewer_group', body.reviewer_group);
    if (body.review_notes !== undefined) gr.setValue('review_notes', body.review_notes);
    if (body.review_status === 'approved') {
        var now = new GlideDateTime();
        gr.setValue('last_reviewed_on', now);
        gr.setValue('last_reviewed_by', gs.getUserID());
    }

    gr.update();
    response.setStatus(200);
    response.setBody({ result: { sys_id: gr.getValue('sys_id'), review_status: gr.getValue('review_status') } });
}

/**
 * GET /modification-requests — Fetch modification requests with filters.
 */
export function getModificationRequests(request, response) {
    var params = request.queryParams;
    var page = parseInt(params.page) || 1;
    var limit = parseInt(params.limit) || 25;
    var offset = (page - 1) * limit;

    var gr = new GlideRecord('x_snc_knowledge_tr_modification_request');
    if (params.state) gr.addQuery('state', params.state);
    if (params.assigned_to) gr.addQuery('assigned_to', params.assigned_to);
    if (params.priority) gr.addQuery('priority', params.priority);

    gr.orderByDesc('sys_created_on');
    gr.chooseWindow(offset, offset + limit);
    gr.query();

    var records = [];
    while (gr.next()) {
        var articleTitle = '';
        if (gr.review_record) {
            var rrGr = new GlideRecord('x_snc_knowledge_tr_review_record');
            if (rrGr.get(gr.review_record.toString())) {
                if (rrGr.article) {
                    var artGr = new GlideRecord('kb_knowledge');
                    if (artGr.get(rrGr.article.toString())) {
                        articleTitle = artGr.getValue('short_description') || '';
                    }
                }
            }
        }
        records.push({
            sys_id: gr.getValue('sys_id'),
            number: gr.getValue('number'),
            short_description: gr.getValue('short_description'),
            article_title: articleTitle,
            review_record: gr.getValue('review_record'),
            modification_type: gr.getValue('modification_type'),
            state: gr.getValue('state'),
            priority: gr.getValue('priority'),
            assigned_to: gr.getDisplayValue('assigned_to'),
            target_resolution_date: gr.getValue('target_resolution_date'),
            requested_by_reviewer: gr.getDisplayValue('requested_by_reviewer'),
            sys_created_on: gr.getValue('sys_created_on'),
        });
    }

    var countGr = new GlideAggregate('x_snc_knowledge_tr_modification_request');
    if (params.state) countGr.addQuery('state', params.state);
    if (params.assigned_to) countGr.addQuery('assigned_to', params.assigned_to);
    countGr.addAggregate('COUNT');
    countGr.query();
    var total = 0;
    if (countGr.next()) total = parseInt(countGr.getAggregate('COUNT'));

    response.setStatus(200);
    response.setBody({ result: records, total: total, page: page, limit: limit });
}

/**
 * POST /modification-requests — Create a new modification request.
 */
export function createModificationRequest(request, response) {
    var body = request.body.data;
    var gr = new GlideRecord('x_snc_knowledge_tr_modification_request');
    gr.initialize();
    gr.review_record = body.review_record;
    gr.short_description = body.short_description || '';
    gr.description = body.description || '';
    gr.modification_type = body.modification_type || 'content_update';
    gr.priority = body.priority || '3';
    gr.target_resolution_date = body.target_resolution_date || '';
    gr.requested_by_reviewer = gs.getUserID();
    gr.state = '1';
    var sysId = gr.insert();

    response.setStatus(201);
    response.setBody({ result: { sys_id: sysId, number: gr.getValue('number') } });
}

/**
 * GET /analytics/kpis — Return KPI summary data.
 */
export function getKPIs(request, response) {
    var totalArticles = 0;
    var approvedCount = 0;
    var staleCount = 0;
    var pendingCount = 0;

    var agg = new GlideAggregate('x_snc_knowledge_tr_review_record');
    agg.addQuery('active', true);
    agg.addAggregate('COUNT');
    agg.groupBy('review_status');
    agg.query();
    while (agg.next()) {
        var count = parseInt(agg.getAggregate('COUNT'));
        var status = agg.getValue('review_status');
        totalArticles += count;
        if (status === 'approved') approvedCount = count;
        if (status === 'pending_review' || status === 're_review_needed') pendingCount += count;
    }

    var freshAgg = new GlideAggregate('x_snc_knowledge_tr_review_record');
    freshAgg.addQuery('active', true);
    freshAgg.addQuery('freshness_score', 'stale');
    freshAgg.addAggregate('COUNT');
    freshAgg.query();
    if (freshAgg.next()) staleCount = parseInt(freshAgg.getAggregate('COUNT'));

    var openMods = 0;
    var modAgg = new GlideAggregate('x_snc_knowledge_tr_modification_request');
    modAgg.addQuery('state', '!=', '3');
    modAgg.addQuery('state', '!=', '4');
    modAgg.addQuery('state', '!=', '7');
    modAgg.addAggregate('COUNT');
    modAgg.query();
    if (modAgg.next()) openMods = parseInt(modAgg.getAggregate('COUNT'));

    response.setStatus(200);
    response.setBody({
        result: {
            total_articles: totalArticles,
            approved_count: approvedCount,
            approved_pct: totalArticles > 0 ? Math.round((approvedCount / totalArticles) * 100) : 0,
            stale_count: staleCount,
            stale_pct: totalArticles > 0 ? Math.round((staleCount / totalArticles) * 100) : 0,
            pending_count: pendingCount,
            open_modification_requests: openMods,
        },
    });
}

/**
 * GET /analytics/source-health — Per-connector health scorecard.
 */
export function getSourceHealth(request, response) {
    var sources = {};
    var gr = new GlideAggregate('x_snc_knowledge_tr_review_record');
    gr.addQuery('active', true);
    gr.addAggregate('COUNT');
    gr.groupBy('source_connector_name');
    gr.groupBy('review_status');
    gr.query();

    while (gr.next()) {
        var name = gr.getValue('source_connector_name') || 'Unknown';
        var status = gr.getValue('review_status');
        var count = parseInt(gr.getAggregate('COUNT'));
        if (!sources[name]) {
            sources[name] = { name: name, total: 0, approved: 0, stale: 0, pending: 0 };
        }
        sources[name].total += count;
        if (status === 'approved') sources[name].approved += count;
        if (status === 'pending_review' || status === 're_review_needed') sources[name].pending += count;
    }

    // Get stale counts
    var staleGr = new GlideAggregate('x_snc_knowledge_tr_review_record');
    staleGr.addQuery('active', true);
    staleGr.addQuery('freshness_score', 'stale');
    staleGr.addAggregate('COUNT');
    staleGr.groupBy('source_connector_name');
    staleGr.query();
    while (staleGr.next()) {
        var sName = staleGr.getValue('source_connector_name') || 'Unknown';
        if (sources[sName]) {
            sources[sName].stale = parseInt(staleGr.getAggregate('COUNT'));
        }
    }

    var result = [];
    for (var key in sources) {
        var s = sources[key];
        result.push({
            name: s.name,
            total: s.total,
            approved_pct: s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0,
            stale_pct: s.total > 0 ? Math.round((s.stale / s.total) * 100) : 0,
            pending: s.pending,
        });
    }

    response.setStatus(200);
    response.setBody({ result: result });
}

/**
 * GET /source-exclusions — Fetch all source exclusion records.
 */
export function getSourceExclusions(request, response) {
    var gr = new GlideRecord('x_snc_knowledge_tr_source_exclusion');
    gr.orderBy('source_name');
    gr.query();

    var records = [];
    while (gr.next()) {
        records.push({
            sys_id: gr.getValue('sys_id'),
            source_name: gr.getValue('source_name'),
            exclusion_reason: gr.getValue('exclusion_reason'),
            active: gr.getValue('active'),
            excluded_by: gr.getDisplayValue('excluded_by'),
            excluded_on: gr.getValue('excluded_on'),
        });
    }

    response.setStatus(200);
    response.setBody({ result: records });
}

/**
 * GET /article-list — Fetch article list records with optional filtering and pagination.
 */
export function getArticleList(request, response) {
    var params = request.queryParams;
    var page = parseInt(params.page) || 1;
    var limit = parseInt(params.limit) || 25;
    var offset = (page - 1) * limit;

    var gr = new GlideRecord('x_snc_knowledge_tr_article_list');
    gr.addQuery('active', true);

    if (params.source) gr.addQuery('source_connector_name', params.source);
    if (params.source_type) gr.addQuery('source_connector_type', params.source_type);

    gr.orderByDesc('synced_on');
    gr.chooseWindow(offset, offset + limit);
    gr.query();

    var records = [];
    while (gr.next()) {
        records.push({
            sys_id: gr.getValue('sys_id'),
            article_title: gr.getValue('article_title'),
            article_url: gr.getValue('article_url'),
            external_doc_id: gr.getValue('external_doc_id'),
            source_connector_name: gr.getValue('source_connector_name'),
            source_connector_type: gr.getValue('source_connector_type'),
            review_record: gr.getValue('review_record'),
            synced_on: gr.getValue('synced_on'),
            last_external_update: gr.getValue('last_external_update'),
        });
    }

    var countGr = new GlideAggregate('x_snc_knowledge_tr_article_list');
    countGr.addQuery('active', true);
    if (params.source) countGr.addQuery('source_connector_name', params.source);
    if (params.source_type) countGr.addQuery('source_connector_type', params.source_type);
    countGr.addAggregate('COUNT');
    countGr.query();
    var total = 0;
    if (countGr.next()) total = parseInt(countGr.getAggregate('COUNT'));

    response.setStatus(200);
    response.setBody({
        result: records,
        total: total,
        page: page,
        limit: limit,
        pages: Math.ceil(total / limit),
    });
}

/**
 * GET /connectors — Get distinct active source connector names for filter pills.
 */
export function getActiveConnectors(request, response) {
    var connectors = [];
    var gr = new GlideAggregate('x_snc_knowledge_tr_review_record');
    gr.addQuery('active', true);
    gr.addNotNullQuery('source_connector_name');
    gr.addAggregate('COUNT');
    gr.groupBy('source_connector_name');
    gr.groupBy('source_connector_type');
    gr.query();
    while (gr.next()) {
        connectors.push({
            name: gr.getValue('source_connector_name'),
            type: gr.getValue('source_connector_type'),
            count: parseInt(gr.getAggregate('COUNT')),
        });
    }

    response.setStatus(200);
    response.setBody({ result: connectors });
}

// ================================================================
// ANALYTICS — Modification Request Stats
// ================================================================

/**
 * GET /analytics/modification-stats — Modification request analytics.
 * Returns: by_state, by_type, total, open, resolved, avg_resolution_days
 */
export function getModificationStats(request, response) {
    // --- By state ---
    var byState = {};
    var stateLabels = { '1': 'Draft', '2': 'Submitted', '3': 'Resolved', '4': 'Rejected', '7': 'Cancelled', '18': 'In Progress' };
    var totalMods = 0;
    var openCount = 0;
    var resolvedCount = 0;

    var stateAgg = new GlideAggregate('x_snc_knowledge_tr_modification_request');
    stateAgg.addAggregate('COUNT');
    stateAgg.groupBy('state');
    stateAgg.query();
    while (stateAgg.next()) {
        var st = stateAgg.getValue('state') || 'unknown';
        var cnt = parseInt(stateAgg.getAggregate('COUNT'));
        byState[st] = { state: st, label: stateLabels[st] || st, count: cnt };
        totalMods += cnt;
        if (st === '3') resolvedCount = cnt;
        if (st !== '3' && st !== '4' && st !== '7') openCount += cnt;
    }

    // --- By type ---
    var byType = {};
    var typeLabels = {
        content_update: 'Mise à jour contenu',
        factual_correction: 'Correction factuelle',
        outdated_info: 'Info obsolète',
        missing_section: 'Section manquante',
        formatting_issue: 'Formatage',
        retire_article: 'Retrait',
    };

    var typeAgg = new GlideAggregate('x_snc_knowledge_tr_modification_request');
    typeAgg.addAggregate('COUNT');
    typeAgg.groupBy('modification_type');
    typeAgg.query();
    while (typeAgg.next()) {
        var mt = typeAgg.getValue('modification_type') || 'other';
        var tc = parseInt(typeAgg.getAggregate('COUNT'));
        byType[mt] = { type: mt, label: typeLabels[mt] || mt, count: tc };
    }

    // --- Average resolution time (closed requests) ---
    var totalDays = 0;
    var closedCount = 0;
    var closedGr = new GlideRecord('x_snc_knowledge_tr_modification_request');
    closedGr.addNotNullQuery('closed_at');
    closedGr.addNotNullQuery('opened_at');
    closedGr.query();
    while (closedGr.next()) {
        var opened = new GlideDateTime(closedGr.getValue('opened_at'));
        var closed = new GlideDateTime(closedGr.getValue('closed_at'));
        var diff = GlideDateTime.subtract(opened, closed);
        var days = diff.getNumericValue() / (1000 * 60 * 60 * 24);
        totalDays += days;
        closedCount++;
    }
    var avgResolutionDays = closedCount > 0 ? Math.round((totalDays / closedCount) * 10) / 10 : null;

    response.setStatus(200);
    response.setBody({
        result: {
            by_state: Object.values(byState),
            by_type: Object.values(byType),
            total: totalMods,
            open: openCount,
            resolved: resolvedCount,
            avg_resolution_days: avgResolutionDays,
        },
    });
}

// ================================================================
// ANALYTICS — Reviewer Performance
// ================================================================

/**
 * GET /analytics/reviewer-stats — Reviewer performance analytics.
 * Returns: assigned_per_reviewer (articles assigned), top_reviewers (by completed reviews)
 */
export function getReviewerStats(request, response) {
    // --- Articles assigned per reviewer ---
    var assigned = [];
    var assignedAgg = new GlideAggregate('x_snc_knowledge_tr_review_record');
    assignedAgg.addQuery('active', true);
    assignedAgg.addNotNullQuery('assigned_reviewer');
    assignedAgg.addAggregate('COUNT');
    assignedAgg.groupBy('assigned_reviewer');
    assignedAgg.orderByAggregate('COUNT', false);
    assignedAgg.query();
    while (assignedAgg.next()) {
        assigned.push({
            reviewer: assignedAgg.getDisplayValue('assigned_reviewer') || 'Unknown',
            reviewer_id: assignedAgg.getValue('assigned_reviewer'),
            count: parseInt(assignedAgg.getAggregate('COUNT')),
        });
    }

    // --- Top reviewers (by completed reviews — last_reviewed_by) ---
    var topReviewers = [];
    var reviewedAgg = new GlideAggregate('x_snc_knowledge_tr_review_record');
    reviewedAgg.addQuery('active', true);
    reviewedAgg.addNotNullQuery('last_reviewed_by');
    reviewedAgg.addAggregate('COUNT');
    reviewedAgg.groupBy('last_reviewed_by');
    reviewedAgg.orderByAggregate('COUNT', false);
    reviewedAgg.query();
    while (reviewedAgg.next()) {
        topReviewers.push({
            reviewer: reviewedAgg.getDisplayValue('last_reviewed_by') || 'Unknown',
            reviewer_id: reviewedAgg.getValue('last_reviewed_by'),
            reviews_completed: parseInt(reviewedAgg.getAggregate('COUNT')),
        });
    }

    // --- Unassigned count ---
    var unassignedAgg = new GlideAggregate('x_snc_knowledge_tr_review_record');
    unassignedAgg.addQuery('active', true);
    unassignedAgg.addNullQuery('assigned_reviewer');
    unassignedAgg.addAggregate('COUNT');
    unassignedAgg.query();
    var unassignedCount = 0;
    if (unassignedAgg.next()) unassignedCount = parseInt(unassignedAgg.getAggregate('COUNT'));

    response.setStatus(200);
    response.setBody({
        result: {
            assigned_per_reviewer: assigned,
            top_reviewers: topReviewers,
            unassigned_count: unassignedCount,
        },
    });
}

// ================================================================
// ANALYTICS — Freshness & Coverage
// ================================================================

/**
 * GET /analytics/freshness-stats — Freshness distribution and coverage analytics.
 * Returns: age_buckets, never_reviewed_count, avg_days_since_review,
 *          mod_requests_per_source (coverage gaps)
 */
export function getFreshnessStats(request, response) {
    // --- Age distribution (days since last review) ---
    var buckets = { lt30: 0, d30_90: 0, d90_180: 0, gt180: 0 };
    var neverReviewed = 0;
    var totalDaysSinceReview = 0;
    var reviewedArticleCount = 0;

    var gr = new GlideRecord('x_snc_knowledge_tr_review_record');
    gr.addQuery('active', true);
    gr.query();
    while (gr.next()) {
        var lastReviewed = gr.getValue('last_reviewed_on');
        if (!lastReviewed) {
            neverReviewed++;
            continue;
        }
        var days = parseInt(gr.getValue('days_since_last_review')) || 0;
        totalDaysSinceReview += days;
        reviewedArticleCount++;
        if (days < 30) buckets.lt30++;
        else if (days < 90) buckets.d30_90++;
        else if (days < 180) buckets.d90_180++;
        else buckets.gt180++;
    }

    var avgDaysSinceReview = reviewedArticleCount > 0
        ? Math.round((totalDaysSinceReview / reviewedArticleCount) * 10) / 10
        : null;

    var ageBuckets = [
        { label: '< 30 jours', count: buckets.lt30 },
        { label: '30–90 jours', count: buckets.d30_90 },
        { label: '90–180 jours', count: buckets.d90_180 },
        { label: '> 180 jours', count: buckets.gt180 },
    ];

    // --- Modification requests per source connector (coverage gaps) ---
    var modsBySource = {};
    var modSourceAgg = new GlideAggregate('x_snc_knowledge_tr_modification_request');
    modSourceAgg.addNotNullQuery('review_record');
    modSourceAgg.addAggregate('COUNT');
    modSourceAgg.groupBy('review_record');
    modSourceAgg.query();

    // First pass: collect counts per review_record
    var rrModCounts = {};
    while (modSourceAgg.next()) {
        var rrId = modSourceAgg.getValue('review_record');
        rrModCounts[rrId] = parseInt(modSourceAgg.getAggregate('COUNT'));
    }

    // Second pass: map review records to source connectors
    if (Object.keys(rrModCounts).length > 0) {
        var rrIds = Object.keys(rrModCounts);
        var rrGr = new GlideRecord('x_snc_knowledge_tr_review_record');
        rrGr.addQuery('sys_id', 'IN', rrIds.join(','));
        rrGr.query();
        while (rrGr.next()) {
            var src = rrGr.getValue('source_connector_name') || 'Unknown';
            if (!modsBySource[src]) modsBySource[src] = { source: src, mod_count: 0, article_count: 0 };
            modsBySource[src].mod_count += rrModCounts[rrGr.getValue('sys_id')] || 0;
        }
    }

    // Get total articles per source for ratio
    var srcAgg = new GlideAggregate('x_snc_knowledge_tr_review_record');
    srcAgg.addQuery('active', true);
    srcAgg.addNotNullQuery('source_connector_name');
    srcAgg.addAggregate('COUNT');
    srcAgg.groupBy('source_connector_name');
    srcAgg.query();
    while (srcAgg.next()) {
        var sName = srcAgg.getValue('source_connector_name') || 'Unknown';
        if (!modsBySource[sName]) modsBySource[sName] = { source: sName, mod_count: 0, article_count: 0 };
        modsBySource[sName].article_count = parseInt(srcAgg.getAggregate('COUNT'));
    }

    response.setStatus(200);
    response.setBody({
        result: {
            age_buckets: ageBuckets,
            never_reviewed_count: neverReviewed,
            avg_days_since_review: avgDaysSinceReview,
            mod_requests_per_source: Object.values(modsBySource),
        },
    });
}
