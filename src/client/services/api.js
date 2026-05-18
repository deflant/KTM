/* API service layer for Knowledge Trust Manager */
const BASE_URL = '/api/x_snc_knowledge_tr/v1/ktm';
const TABLE_API = '/api/now/table';
const CSP_SEARCH_CONFIG = '6f77d2b2c3022010a6f3f97c9840dd4b';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserToken': window.g_ck || '',
    };
}

async function apiGet(path, params) {
    const url = new URL(BASE_URL + path, window.location.origin);
    if (params) {
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url.searchParams.set(key, params[key]);
            }
        });
    }
    const resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    return resp.json();
}

async function apiPatch(path, body) {
    const resp = await fetch(BASE_URL + path, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    return resp.json();
}

async function apiPost(path, body) {
    const resp = await fetch(BASE_URL + path, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    return resp.json();
}

/* Review Records */
export function fetchReviewRecords(filters) { return apiGet('/review-records', filters); }

/* Fetch review record detail via Table API for reliable field access */
export async function fetchReviewRecordDetail(id) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_review_record/' + id, window.location.origin);
    url.searchParams.set('sysparm_display_value', 'all');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    var data = await resp.json();
    var r = (data && data.result) ? data.result : {};

    // Fetch KB article data if linked
    var articleData = {};
    if (r.article && r.article.value) {
        try {
            var artUrl = new URL(TABLE_API + '/kb_knowledge/' + r.article.value, window.location.origin);
            artUrl.searchParams.set('sysparm_fields', 'sys_id,short_description,text,author,kb_knowledge_base,kb_category,source');
            artUrl.searchParams.set('sysparm_display_value', 'all');
            var artResp = await fetch(artUrl.toString(), { headers: getHeaders() });
            if (artResp.ok) {
                var artData = await artResp.json();
                if (artData && artData.result) {
                    var a = artData.result;
                    articleData = {
                        sys_id: a.sys_id ? (a.sys_id.value || a.sys_id) : '',
                        short_description: a.short_description ? (a.short_description.display_value || a.short_description.value || '') : '',
                        text: a.text ? (a.text.value || '') : '',
                        author: a.author ? (a.author.display_value || '') : '',
                        kb_knowledge_base: a.kb_knowledge_base ? (a.kb_knowledge_base.display_value || '') : '',
                        kb_category: a.kb_category ? (a.kb_category.display_value || '') : '',
                        source_url: a.source ? (a.source.value || '') : '',
                    };
                }
            }
        } catch (e) { /* ignore */ }
    }

    // Normalize: display_value=all returns {value, display_value} objects
    function dv(field) {
        if (!field) return '';
        if (typeof field === 'string') return field;
        return field.display_value || field.value || '';
    }
    function val(field) {
        if (!field) return '';
        if (typeof field === 'string') return field;
        return field.value || '';
    }

    return {
        result: {
            sys_id: val(r.sys_id),
            display_title: val(r.display_title),
            external_doc_title: val(r.external_doc_title),
            external_doc_id: val(r.external_doc_id),
            external_doc_url: val(r.external_doc_url),
            external_doc_table: val(r.external_doc_table),
            review_status: val(r.review_status),
            freshness_score: val(r.freshness_score),
            assigned_reviewer: dv(r.assigned_reviewer),
            assigned_reviewer_id: val(r.assigned_reviewer),
            reviewer_group: dv(r.reviewer_group),
            source_connector_name: val(r.source_connector_name),
            source_connector_type: val(r.source_connector_type),
            last_reviewed_on: val(r.last_reviewed_on),
            last_reviewed_by: dv(r.last_reviewed_by),
            last_external_update: val(r.last_external_update),
            review_notes: val(r.review_notes),
            days_since_last_review: val(r.days_since_last_review),
            days_since_last_update: val(r.days_since_last_update),
            active: val(r.active),
            article: articleData,
        },
    };
}

/* Update review record via Table API PATCH — reliable */
export async function updateReviewRecord(id, data) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_review_record/' + id, window.location.origin);
    var resp = await fetch(url.toString(), {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    return resp.json();
}

/* Fetch article_list entry for a given review_record sys_id to get the external URL */
export async function fetchArticleUrlByReviewRecord(reviewRecordId) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    url.searchParams.set('sysparm_query', 'review_record=' + reviewRecordId);
    url.searchParams.set('sysparm_fields', 'article_url,article_title,external_doc_id,source_connector_name,source_connector_type');
    url.searchParams.set('sysparm_limit', '1');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return null;
    var data = await resp.json();
    if (data && data.result && data.result.length > 0) return data.result[0];
    return null;
}

/* Fetch modification requests linked to a review record */
export async function fetchModRequestsByReviewRecord(reviewRecordId) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_modification_request', window.location.origin);
    url.searchParams.set('sysparm_query', 'review_record=' + reviewRecordId + '^ORDERBYDESCsys_created_on');
    url.searchParams.set('sysparm_display_value', 'all');
    url.searchParams.set('sysparm_limit', '20');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return [];
    var data = await resp.json();
    if (!data || !data.result) return [];
    return data.result.map(function (r) {
        function dv(f) { return f ? (typeof f === 'string' ? f : f.display_value || f.value || '') : ''; }
        function val(f) { return f ? (typeof f === 'string' ? f : f.value || '') : ''; }
        return {
            sys_id: val(r.sys_id),
            number: val(r.number),
            short_description: val(r.short_description),
            description: val(r.description),
            state: val(r.state),
            state_display: dv(r.state),
            priority: val(r.priority),
            priority_display: dv(r.priority),
            modification_type: val(r.modification_type),
            modification_type_display: dv(r.modification_type),
            assigned_to: dv(r.assigned_to),
            assigned_to_id: val(r.assigned_to),
            sys_created_on: val(r.sys_created_on),
            sys_created_by: dv(r.sys_created_by),
        };
    });
}

/**
 * Update an approval record (sysapproval_approver) — approve or reject.
 * @param {string} sysId — the approval record sys_id
 * @param {string} state — 'approved' or 'rejected'
 * @param {string} [comments] — optional comments
 */
export async function updateApproval(sysId, state, comments) {
    var url = new URL(TABLE_API + '/sysapproval_approver/' + sysId, window.location.origin);
    var body = { state: state };
    if (comments) body.comments = comments;
    var resp = await fetch(url.toString(), {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    return resp.json();
}

/**
 * Fetch approval records (sysapproval_approver) linked to modification requests.
 * @param {string[]} modRequestIds — array of modification request sys_ids
 * @returns {Promise<Array>} — approval records
 */
export async function fetchApprovalsByModRequests(modRequestIds) {
    if (!modRequestIds || modRequestIds.length === 0) return [];
    var url = new URL(TABLE_API + '/sysapproval_approver', window.location.origin);
    url.searchParams.set('sysparm_query',
        'document_id.sys_class_name=x_snc_knowledge_tr_modification_request' +
        '^document_idIN' + modRequestIds.join(',') +
        '^ORDERBYDESCsys_created_on'
    );
    url.searchParams.set('sysparm_fields', 'sys_id,state,approver,document_id,source_table,sys_created_on,sys_updated_on,comments,expected_start');
    url.searchParams.set('sysparm_display_value', 'all');
    url.searchParams.set('sysparm_limit', '50');
    try {
        var resp = await fetch(url.toString(), { headers: getHeaders() });
        if (!resp.ok) return [];
        var data = await resp.json();
        if (!data || !data.result) return [];
        return data.result.map(function (r) {
            function dv(f) { return f ? (typeof f === 'string' ? f : f.display_value || f.value || '') : ''; }
            function val(f) { return f ? (typeof f === 'string' ? f : f.value || '') : ''; }
            return {
                sys_id: val(r.sys_id),
                state: val(r.state),
                state_display: dv(r.state),
                approver: dv(r.approver),
                approver_id: val(r.approver),
                document_id: val(r.document_id),
                document_display: dv(r.document_id),
                source_table: val(r.source_table),
                sys_created_on: val(r.sys_created_on),
                sys_updated_on: val(r.sys_updated_on),
                comments: val(r.comments),
            };
        });
    } catch (e) {
        return [];
    }
}

/* Search sys_user for reassignment */
export async function searchUsers(query) {
    var url = new URL(TABLE_API + '/sys_user', window.location.origin);
    var q = 'active=true';
    if (query) q += '^nameLIKE' + query + '^ORuser_nameLIKE' + query + '^ORemailLIKE' + query;
    url.searchParams.set('sysparm_query', q + '^ORDERBYname');
    url.searchParams.set('sysparm_fields', 'sys_id,name,user_name,email,title');
    url.searchParams.set('sysparm_limit', '10');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return [];
    var data = await resp.json();
    return (data && data.result) ? data.result : [];
}

/* Get current user display name */
var _cachedUserName = null;
export async function getCurrentUserName() {
    if (_cachedUserName) return _cachedUserName;
    try {
        var url = new URL(TABLE_API + '/sys_user', window.location.origin);
        url.searchParams.set('sysparm_query', 'sys_id=javascript:gs.getUserID()');
        url.searchParams.set('sysparm_fields', 'name,user_name');
        url.searchParams.set('sysparm_limit', '1');
        var resp = await fetch(url.toString(), { headers: getHeaders() });
        if (resp.ok) {
            var data = await resp.json();
            if (data && data.result && data.result.length > 0) {
                _cachedUserName = data.result[0].name || data.result[0].user_name;
                return _cachedUserName;
            }
        }
    } catch (e) { /* ignore */ }
    return 'Unknown';
}

/* Modification Requests */
export function fetchModificationRequests(filters) { return apiGet('/modification-requests', filters); }
export function createModificationRequest(data) { return apiPost('/modification-requests', data); }

/**
 * Update a modification request via Table API PATCH.
 * @param {string} sysId — the modification request sys_id
 * @param {object} fields — fields to update (state, resolution_summary, close_notes, etc.)
 */
export async function updateModificationRequest(sysId, fields) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_modification_request/' + sysId, window.location.origin);
    var resp = await fetch(url.toString(), {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(fields),
    });
    if (!resp.ok) throw new Error('API error: ' + resp.status);
    return resp.json();
}

/* Analytics */
export function fetchKPIs() { return apiGet('/analytics/kpis'); }
export function fetchSourceHealth() { return apiGet('/analytics/source-health'); }
export function fetchModificationStats() { return apiGet('/analytics/modification-stats'); }
export function fetchReviewerStats() { return apiGet('/analytics/reviewer-stats'); }
export function fetchFreshnessStats() { return apiGet('/analytics/freshness-stats'); }

/* Configuration */
export function fetchSourceExclusions() { return apiGet('/source-exclusions'); }
export function fetchActiveConnectors() { return apiGet('/connectors'); }

/* Sync KB Articles — calls server-side handler to scan kb_knowledge */
export function syncKBArticlesFromServer() { return apiPost('/sync-kb-articles', {}); }

/* ────────────── Source Exclusion Management ────────────── */

/**
 * Fetch all ACTIVE excluded source names from the exclusion table.
 * Returns an array of { sys_id, source_name }.
 */
export async function fetchExcludedSources() {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_source_exclusion', window.location.origin);
    url.searchParams.set('sysparm_query', 'active=true');
    url.searchParams.set('sysparm_fields', 'sys_id,source_name');
    url.searchParams.set('sysparm_limit', '200');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return [];
    var data = await resp.json();
    return (data && data.result) ? data.result : [];
}

/**
 * Fetch all distinct source connector names (from article_list table).
 * Returns an array of unique source names.
 */
export async function fetchAllSourceNames() {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    url.searchParams.set('sysparm_query', 'active=true^source_connector_nameISNOTEMPTY^source_connector_type!=other');
    url.searchParams.set('sysparm_fields', 'source_connector_name,source_connector_type');
    url.searchParams.set('sysparm_limit', '1000');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return [];
    var data = await resp.json();
    if (!data || !data.result) return [];
    var seen = {};
    var result = [];
    data.result.forEach(function (r) {
        var name = r.source_connector_name;
        if (name && !seen[name]) {
            seen[name] = true;
            result.push({ name: name, type: r.source_connector_type || '' });
        }
    });
    return result;
}

/**
 * Create a new source exclusion record.
 */
export async function addSourceExclusion(sourceName, reason) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_source_exclusion', window.location.origin);
    var resp = await fetch(url.toString(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            source_name: sourceName,
            exclusion_reason: reason || 'Excluded via KTM Configuration',
            active: 'true',
        }),
    });
    return resp.ok;
}

/**
 * Remove (deactivate) a source exclusion record by sys_id.
 */
export async function removeSourceExclusion(sysId) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_source_exclusion/' + sysId, window.location.origin);
    var resp = await fetch(url.toString(), {
        method: 'DELETE',
        headers: getHeaders(),
    });
    return resp.ok;
}

/**
 * Build the encoded query fragment to exclude sources.
 * @param {string[]} excludedNames — array of source names to exclude
 * @returns {string} encoded query fragment (e.g. "source_connector_nameNOT INFoo,Bar")
 */
export function buildSourceFilter(excludedNames) {
    var base = 'active=true^source_connector_type!=other^source_connector_nameISNOTEMPTY';
    if (excludedNames && excludedNames.length > 0) {
        base += '^source_connector_nameNOT IN' + excludedNames.join(',');
    }
    return base;
}

/**
 * Ensure a review_record exists for an article_list entry.
 * If missing, creates one and links it back. Returns the review_record sys_id.
 */
export async function ensureReviewRecord(articleRow) {
    // Already has a review record
    if (articleRow.review_record) return articleRow.review_record;

    var title = (articleRow.article_title || '').replace(/<\/?highlight>/g, '') || '(Sans titre)';

    // 1. Create the review record
    var rrUrl = new URL(TABLE_API + '/x_snc_knowledge_tr_review_record', window.location.origin);
    var rrResp = await fetch(rrUrl.toString(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            external_doc_id: articleRow.external_doc_id || articleRow.sys_id,
            external_doc_title: title,
            display_title: title,
            external_doc_url: articleRow.article_url || '',
            review_status: 'pending_review',
            freshness_score: 'fresh',
            source_connector_name: articleRow.source_connector_name || '',
            source_connector_type: articleRow.source_connector_type || '',
            active: 'true',
        }),
    });
    if (!rrResp.ok) return null;
    var rrData = await rrResp.json();
    var rrSysId = (rrData && rrData.result) ? rrData.result.sys_id : null;
    if (!rrSysId) return null;

    // 2. Link the article_list entry to the review record
    var alUrl = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list/' + articleRow.sys_id, window.location.origin);
    await fetch(alUrl.toString(), {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ review_record: rrSysId }),
    });

    return rrSysId;
}

/**
 * Resolve the actual source URL for a web crawler article.
 * Looks up the base URL from sn_ext_conn_wc_predefined_source_config
 * and constructs a search-friendly URL on that source.
 */
var _wcBaseUrlCache = null;
export async function resolveWebCrawlerUrl(articleTitle) {
    if (!_wcBaseUrlCache) {
        _wcBaseUrlCache = {};
        try {
            var url = new URL(TABLE_API + '/sn_ext_conn_wc_predefined_source_config', window.location.origin);
            url.searchParams.set('sysparm_query', 'active=true^urlISNOTEMPTY');
            url.searchParams.set('sysparm_fields', 'label,url');
            url.searchParams.set('sysparm_limit', '100');
            var resp = await fetch(url.toString(), { headers: getHeaders() });
            if (resp.ok) {
                var data = await resp.json();
                if (data && data.result) {
                    data.result.forEach(function (s) {
                        if (s.label && s.url) _wcBaseUrlCache[s.label] = s.url;
                    });
                }
            }
        } catch (e) { /* ignore */ }
    }

    // Try to match the article title with a source name suffix (e.g. "... - Apple Support")
    var cleanTitle = (articleTitle || '').replace(/<\/?highlight>/g, '');
    var matchedBase = '';
    var matchedLabel = '';
    Object.keys(_wcBaseUrlCache).forEach(function (label) {
        if (cleanTitle.indexOf(label) >= 0) {
            matchedBase = _wcBaseUrlCache[label];
            matchedLabel = label;
        }
    });

    if (matchedBase) {
        // Build a Google search scoped to the source domain
        var domain = '';
        try { domain = new URL(matchedBase).hostname; } catch (e) { domain = matchedBase; }
        var searchTitle = cleanTitle.replace(new RegExp('\\s*[-–—|]\\s*' + matchedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '').trim();
        return 'https://www.google.com/search?q=site%3A' + encodeURIComponent(domain) + '+' + encodeURIComponent(searchTitle);
    }

    // Fallback: Google search with the full title
    return 'https://www.google.com/search?q=' + encodeURIComponent(cleanTitle);
}

/* ────────────── Article List ────────────── */

/**
 * Fetch article list entries from the Table API with dot-walking for review record fields.
 */
export async function fetchArticleList(filters) {
    const url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    url.searchParams.set('sysparm_query', buildArticleListQuery(filters));
    url.searchParams.set('sysparm_fields', 'sys_id,article_title,article_url,external_doc_id,source_connector_name,source_connector_type,review_record,review_record.review_status,review_record.freshness_score,review_record.assigned_reviewer');
    url.searchParams.set('sysparm_display_value', 'all');
    url.searchParams.set('sysparm_limit', String(filters.limit || 25));
    url.searchParams.set('sysparm_offset', String(((parseInt(filters.page) || 1) - 1) * (filters.limit || 25)));
    url.searchParams.set('sysparm_suppress_pagination_header', 'false');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');

    const resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) throw new Error('API error: ' + resp.status);

    var totalCount = parseInt(resp.headers.get('X-Total-Count')) || 0;
    const data = await resp.json();
    const rawRecords = (data && data.result) ? data.result : [];
    if (!totalCount && rawRecords.length > 0) totalCount = rawRecords.length;
    const limit = filters.limit || 25;

    function dv(f) { return f ? (typeof f === 'string' ? f : f.display_value || f.value || '') : ''; }
    function val(f) { return f ? (typeof f === 'string' ? f : f.value || '') : ''; }

    const records = rawRecords.map(function (r) {
        return {
            sys_id: val(r.sys_id),
            article_title: val(r.article_title),
            article_url: val(r.article_url),
            external_doc_id: val(r.external_doc_id),
            source_connector_name: val(r.source_connector_name),
            source_connector_type: val(r.source_connector_type),
            review_record: val(r.review_record),
            review_status: val(r['review_record.review_status']),
            freshness_score: val(r['review_record.freshness_score']),
            assigned_reviewer: dv(r['review_record.assigned_reviewer']),
        };
    });

    return {
        result: records,
        total: totalCount,
        page: parseInt(filters.page) || 1,
        limit: limit,
        pages: Math.max(1, Math.ceil(totalCount / limit)),
    };
}

function buildArticleListQuery(filters) {
    var excl = filters.excludedSources;
    var parts = ['active=true', 'source_connector_type!=other', 'source_connector_nameISNOTEMPTY'];
    if (excl && excl.length > 0) parts.push('source_connector_nameNOT IN' + excl.join(','));
    if (filters.source) parts.push('source_connector_name=' + filters.source);
    if (filters.source_type) parts.push('source_connector_type=' + filters.source_type);
    if (filters.search) parts.push('article_titleLIKE' + filters.search);
    if (filters.status) parts.push('review_record.review_status=' + filters.status);
    if (filters.freshness) parts.push('review_record.freshness_score=' + filters.freshness);
    return parts.join('^');
}

/**
 * Fetch distinct source connector names with article counts.
 * Used by the ArticleListPage to display dynamic source filter pills.
 * @param {string[]} excludedSources - source names to exclude
 * @returns {Promise<Array<{name: string, type: string, count: number}>>}
 */
export async function fetchDistinctSources(excludedSources) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    var q = 'active=true^source_connector_type!=other^source_connector_nameISNOTEMPTY';
    if (excludedSources && excludedSources.length > 0) {
        q += '^source_connector_nameNOT IN' + excludedSources.join(',');
    }
    url.searchParams.set('sysparm_query', q);
    url.searchParams.set('sysparm_fields', 'source_connector_name,source_connector_type');
    url.searchParams.set('sysparm_limit', '2000');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return [];
    var data = await resp.json();
    if (!data || !data.result) return [];
    var counts = {};
    data.result.forEach(function (r) {
        var name = r.source_connector_name;
        if (!name) return;
        if (!counts[name]) counts[name] = { name: name, type: r.source_connector_type || '', count: 0 };
        counts[name].count++;
    });
    // Sort by count descending
    return Object.values(counts).sort(function (a, b) { return b.count - a.count; });
}

/* ────────────── AI Search helpers ────────────── */

/**
 * Call the AI Search API to find indexed documents.
 */
async function searchAIS(searchTerm) {
    const url = new URL('/api/now/aisa/search', window.location.origin);
    const body = {
        searchContextConfigId: CSP_SEARCH_CONFIG,
        searchTerm: searchTerm,
        rpSysId: 'dummy',
    };
    try {
        const resp = await fetch(url.toString(), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        if (!resp.ok) return null;
        return resp.json();
    } catch (e) {
        return null;
    }
}

/** Tables that are part of the ServiceNow platform (NOT external connectors) */
const PLATFORM_TABLES = [
    'kb_knowledge', 'sc_cat_item', 'sc_cat_item_guide',
    'incident', 'sys_attachment', 'sn_customerservice_case', 'problem',
    'change_request', 'task', 'sys_user', 'cmdb_ci', 'cmdb_ci_service',
    'sys_app', 'sys_choice', 'sys_documentation',
];

/**
 * Check if a table name corresponds to an external content connector.
 */
function isExternalConnectorTable(tableName) {
    if (!tableName) return false;
    if (PLATFORM_TABLES.indexOf(tableName) >= 0) return false;
    // External content connector tables contain these patterns
    if (tableName.indexOf('ext_conn') >= 0) return true;
    if (tableName.indexOf('external_search') >= 0) return true;
    if (tableName.indexOf('_cc_') >= 0) return true;
    if (tableName.indexOf('_sp_') >= 0) return true;
    if (tableName.indexOf('_wc_') >= 0) return true;
    // Fallback: if it's not a known platform table, treat as external
    return true;
}

/**
 * Determine connector name and type from the source table name.
 */
function classifyConnector(tableName) {
    if (tableName.indexOf('confluence') >= 0 || tableName.indexOf('_cc_') >= 0) {
        return { name: 'Confluence Cloud', type: 'confluence' };
    }
    if (tableName.indexOf('sharepoint') >= 0 || tableName.indexOf('_sp_') >= 0) {
        return { name: 'SharePoint Online', type: 'sharepoint' };
    }
    if (tableName.indexOf('web_crawler') >= 0 || tableName.indexOf('_wc_') >= 0) {
        return { name: 'Web Crawler', type: 'web_crawler' };
    }
    if (tableName.indexOf('google') >= 0) {
        return { name: 'Google Drive', type: 'google_drive' };
    }
    return { name: 'External (' + tableName + ')', type: 'web_crawler' };
}

/**
 * Fetch the URL of an external document from its source table.
 * Falls back to constructing URL from connector metadata.
 */
async function fetchDocUrlFromSource(tableName, docId) {
    // Try querying by sys_id first, then by id field
    var queries = ['sys_id=' + docId, 'id=' + docId];
    for (var q = 0; q < queries.length; q++) {
        const url = new URL(TABLE_API + '/' + tableName, window.location.origin);
        url.searchParams.set('sysparm_query', queries[q]);
        url.searchParams.set('sysparm_fields', 'url,source_url,title,preview_url');
        url.searchParams.set('sysparm_limit', '1');
        try {
            const resp = await fetch(url.toString(), { headers: getHeaders() });
            if (!resp.ok) continue;
            const data = await resp.json();
            if (data && data.result && data.result.length > 0) {
                var rec = data.result[0];
                var foundUrl = rec.url || rec.source_url || rec.preview_url || '';
                if (foundUrl) return { url: foundUrl, title: rec.title || '' };
            }
        } catch (e) { /* ignore, try next */ }
    }
    return null;
}

/**
 * Extract URL from an AI Search result object, checking nested properties.
 */
function extractUrlFromSearchResult(r) {
    // Direct fields
    if (r.url) return r.url;
    if (r.contentUrl) return r.contentUrl;
    if (r.source_url) return r.source_url;
    if (r.link) return r.link;
    if (r.preview_url) return r.preview_url;
    // Nested in metadata / properties
    if (r.metadata) {
        if (r.metadata.url) return r.metadata.url;
        if (r.metadata.source_url) return r.metadata.source_url;
        if (r.metadata.contentUrl) return r.metadata.contentUrl;
    }
    if (r.properties) {
        if (r.properties.url) return r.properties.url;
        if (r.properties.source_url) return r.properties.source_url;
    }
    if (r.fields) {
        if (r.fields.url) return r.fields.url;
        if (r.fields.source_url) return r.fields.source_url;
    }
    // Nested in record
    if (r.record) {
        if (r.record.url) return r.record.url;
        if (r.record.source_url) return r.record.source_url;
    }
    return '';
}

/**
 * Check if an article_list entry already exists for a given external_doc_id.
 * Returns the sys_id and article_url if found, null otherwise.
 */
async function getExistingArticleListEntry(externalDocId) {
    const url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    url.searchParams.set('sysparm_query', 'external_doc_id=' + externalDocId);
    url.searchParams.set('sysparm_fields', 'sys_id,article_url');
    url.searchParams.set('sysparm_limit', '1');
    url.searchParams.set('sysparm_exclude_reference_link', 'true');
    try {
        const resp = await fetch(url.toString(), { headers: getHeaders() });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data && data.result && data.result.length > 0) {
            return data.result[0];
        }
    } catch (e) { /* ignore */ }
    return null;
}

/**
 * Update an existing article_list entry via the Table API.
 */
async function updateArticleListDirect(sysId, fields) {
    const url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list/' + sysId, window.location.origin);
    try {
        const resp = await fetch(url.toString(), {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(fields),
        });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

/**
 * Create an article_list entry via the Table API.
 */
async function createArticleListDirect(fields) {
    const url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    try {
        const resp = await fetch(url.toString(), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(fields),
        });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

/**
 * Sync article list from External Content Connectors via AI Search.
 *
 * 1. Search AI Search with *** to discover all indexed documents
 * 2. Keep ONLY external content connector documents (not KB, incident, etc.)
 * 3. For each doc, fetch title + URL from the source table
 * 4. Create article_list entries via Table API
 */
export async function syncArticleListFromConnectors() {
    const info = [];
    const allResults = {};
    const tableCounts = {};

    // Step 1: AI Search with *** to find all indexed documents
    const terms = ['***', '*'];
    for (const term of terms) {
        const res = await searchAIS(term);
        if (!res) { info.push('"' + term + '": no response'); continue; }

        const searchData = res.result && res.result.search
            ? res.result.search
            : (res.search || {});
        const results = searchData.searchResults || [];
        info.push('"' + term + '": ' + results.length + ' results');

        for (const r of results) {
            const sysId = r.sysId || r.sys_id || '';
            const table = r.table || '';
            const title = r.title || '';
            // Extract URL from all possible locations in the result
            const url = extractUrlFromSearchResult(r);

            if (!sysId || allResults[sysId]) continue;
            allResults[sysId] = { sysId: sysId, table: table, title: title, url: url, raw: r };
            tableCounts[table] = (tableCounts[table] || 0) + 1;
        }
    }

    // Log table distribution
    const tableEntries = Object.entries(tableCounts).map(function (e) { return e[0] + ':' + e[1]; });
    if (tableEntries.length > 0) info.push('tables=[' + tableEntries.join(', ') + ']');

    // Step 2: Filter for external content connector docs ONLY
    const externalDocs = Object.values(allResults).filter(function (r) {
        return isExternalConnectorTable(r.table);
    });
    info.push(externalDocs.length + ' external connector docs after filtering');

    // Step 3: Get Confluence host for search URLs (only for confluence-type docs)
    var connectorHost = '';
    if (externalDocs.length > 0) {
        try {
            var httpUrl = new URL(TABLE_API + '/http_connection', window.location.origin);
            httpUrl.searchParams.set('sysparm_query', 'hostLIKEatlassian^active=true');
            httpUrl.searchParams.set('sysparm_fields', 'host');
            httpUrl.searchParams.set('sysparm_limit', '1');
            var httpResp = await fetch(httpUrl.toString(), { headers: getHeaders() });
            if (httpResp.ok) {
                var httpData = await httpResp.json();
                if (httpData && httpData.result && httpData.result.length > 0) {
                    connectorHost = httpData.result[0].host || '';
                }
            }
        } catch (e) { /* ignore */ }
        if (connectorHost) info.push('host=' + connectorHost);
    }

    // Step 3b: Get web crawler predefined source configs for base URLs
    var wcBaseUrls = {};
    try {
        var wcUrl = new URL(TABLE_API + '/sn_ext_conn_wc_predefined_source_config', window.location.origin);
        wcUrl.searchParams.set('sysparm_query', 'active=true^urlISNOTEMPTY');
        wcUrl.searchParams.set('sysparm_fields', 'label,url');
        wcUrl.searchParams.set('sysparm_limit', '100');
        var wcResp = await fetch(wcUrl.toString(), { headers: getHeaders() });
        if (wcResp.ok) {
            var wcData = await wcResp.json();
            if (wcData && wcData.result) {
                wcData.result.forEach(function (s) {
                    if (s.label && s.url) wcBaseUrls[s.label] = s.url;
                });
            }
        }
    } catch (e) { /* ignore */ }

    // Step 4: Create/update article_list entries
    let created = 0;
    let updated = 0;

    for (const doc of externalDocs) {
        var docTitle = (doc.title || '').replace(/<\/?highlight>/g, '') || '(Untitled)';
        var conn = classifyConnector(doc.table);

        // Build URL: prefer AI Search result URL, then connector-specific fallback
        var docUrl = doc.url || '';
        if (!docUrl && conn.type === 'confluence' && connectorHost) {
            docUrl = 'https://' + connectorHost + '/wiki/search?text=' + encodeURIComponent('"' + docTitle + '"');
        }
        if (!docUrl && conn.type === 'web_crawler') {
            // Match title to a predefined web crawler source config
            var wcKeys = Object.keys(wcBaseUrls);
            for (var wi = 0; wi < wcKeys.length; wi++) {
                if (docTitle.indexOf(wcKeys[wi]) >= 0) {
                    var baseUrl = wcBaseUrls[wcKeys[wi]];
                    // Strip the source label from the title for a cleaner search query
                    var searchTitle = docTitle.replace(new RegExp('\\s*[-–—|]\\s*' + wcKeys[wi].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '').trim();
                    docUrl = baseUrl.replace(/\/+$/, '') + '/search?q=' + encodeURIComponent(searchTitle);
                    break;
                }
            }
        }

        // Check if entry already exists
        const existing = await getExistingArticleListEntry(doc.sysId);

        if (existing) {
            await updateArticleListDirect(existing.sys_id, {
                article_title: docTitle,
                article_url: docUrl || '',
                source_connector_name: conn.name,
                source_connector_type: conn.type,
            });
            updated++;
            continue;
        }

        // Create new entry
        const ok = await createArticleListDirect({
            article_title: docTitle,
            article_url: docUrl || '',
            external_doc_id: doc.sysId,
            source_connector_name: conn.name,
            source_connector_type: conn.type,
            active: 'true',
        });

        if (ok) created++;
    }

    return {
        result: {
            total_found: externalDocs.length,
            articles_created: created,
            articles_updated: updated,
            info: info,
        }
    };
}

/* ────────────── Existing Sync Connectors (for review records) ────────────── */

/**
 * Create a review record directly via the Table API.
 */
async function createReviewRecordDirect(fields) {
    const url = new URL(TABLE_API + '/x_snc_knowledge_tr_review_record', window.location.origin);
    try {
        const resp = await fetch(url.toString(), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(fields),
        });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

/**
 * Check if a review record already exists for an external_doc_id.
 */
async function reviewRecordExists(externalDocId) {
    const url = new URL(TABLE_API + '/x_snc_knowledge_tr_review_record', window.location.origin);
    url.searchParams.set('sysparm_query', 'external_doc_id=' + externalDocId);
    url.searchParams.set('sysparm_fields', 'sys_id');
    url.searchParams.set('sysparm_limit', '1');
    try {
        const resp = await fetch(url.toString(), { headers: getHeaders() });
        if (!resp.ok) return false;
        const data = await resp.json();
        return data && data.result && data.result.length > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Full client-side sync for review records:
 * 1. Call AI Search with multiple terms to find external content
 * 2. Filter for non-platform results (connector documents)
 * 3. Create review records directly via Table API
 */
export async function syncConnectors() {
    const info = [];
    const allResults = {};
    const tableCounts = {};
    let created = 0;
    let skipped = 0;

    const terms = ['*', 'confluence', 'a'];
    for (const term of terms) {
        const res = await searchAIS(term);
        if (!res) { info.push('"' + term + '": no response'); continue; }

        const searchData = res.result && res.result.search ? res.result.search : (res.search || {});
        const results = searchData.searchResults || [];
        info.push('"' + term + '": ' + results.length + ' results');

        for (const r of results) {
            const sysId = r.sysId || r.sys_id || '';
            const table = r.table || '';
            const title = r.title || '';
            if (!sysId || allResults[sysId]) continue;
            allResults[sysId] = { sysId, table, title };
            tableCounts[table] = (tableCounts[table] || 0) + 1;
        }
    }

    const tableEntries = Object.entries(tableCounts).map(function (e) { return e[0] + ':' + e[1]; });
    if (tableEntries.length > 0) info.push('tables=[' + tableEntries.join(', ') + ']');

    const externalDocs = Object.values(allResults).filter(function (r) {
        return isExternalConnectorTable(r.table);
    });
    info.push(externalDocs.length + ' external docs after filtering');

    for (const doc of externalDocs) {
        const exists = await reviewRecordExists(doc.sysId);
        if (exists) { skipped++; continue; }

        const conn = classifyConnector(doc.table);
        const ok = await createReviewRecordDirect({
            external_doc_id: doc.sysId,
            external_doc_title: doc.title,
            external_doc_table: doc.table,
            display_title: doc.title || '(Untitled)',
            review_status: 'pending_review',
            freshness_score: 'fresh',
            source_connector_name: conn.name,
            source_connector_type: conn.type,
            active: 'true',
        });

        if (ok) created++;
    }

    return {
        result: {
            articles_scanned: externalDocs.length,
            records_created: created,
            records_skipped: skipped,
            info: info,
        }
    };
}
