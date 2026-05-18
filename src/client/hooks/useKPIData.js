import { useState, useEffect, useCallback } from 'react';
import { buildSourceFilter } from '../services/api.js';

var TABLE_API = '/api/now/table';

function getHeaders() {
    return { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-UserToken': window.g_ck || '' };
}

async function countArticles(query) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_article_list', window.location.origin);
    url.searchParams.set('sysparm_query', query);
    url.searchParams.set('sysparm_fields', 'sys_id');
    url.searchParams.set('sysparm_limit', '500');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return 0;
    var data = await resp.json();
    return (data && data.result) ? data.result.length : 0;
}

async function countModRequests(query) {
    var url = new URL(TABLE_API + '/x_snc_knowledge_tr_modification_request', window.location.origin);
    url.searchParams.set('sysparm_query', query);
    url.searchParams.set('sysparm_fields', 'sys_id');
    url.searchParams.set('sysparm_limit', '500');
    var resp = await fetch(url.toString(), { headers: getHeaders() });
    if (!resp.ok) return 0;
    var data = await resp.json();
    return (data && data.result) ? data.result.length : 0;
}

export default function useKPIData(excludedSources) {
    var _s = useState(null), data = _s[0], setData = _s[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];

    var load = useCallback(function () {
        setLoading(true);
        var BASE_FILTER = buildSourceFilter(excludedSources);
        Promise.all([
            countArticles(BASE_FILTER),
            countArticles(BASE_FILTER + '^review_record.review_status=approved'),
            countArticles(BASE_FILTER + '^review_record.review_status=pending_review'),
            countArticles(BASE_FILTER + '^review_record.freshness_score=stale'),
            countModRequests('stateNOT INresolved,rejected,cancelled'),
        ]).then(function (counts) {
            var total = counts[0] || 0;
            var approved = counts[1] || 0;
            var pending = counts[2] || 0;
            var stale = counts[3] || 0;
            var openMods = counts[4] || 0;
            setData({
                total_articles: total,
                approved_pct: total > 0 ? Math.round((approved / total) * 100) : 0,
                stale_pct: total > 0 ? Math.round((stale / total) * 100) : 0,
                pending_count: pending,
                open_modification_requests: openMods,
            });
            setLoading(false);
        }).catch(function () { setLoading(false); });
    }, [excludedSources]);

    useEffect(function () { load(); }, [load]);

    return { data: data, loading: loading, refresh: load };
}
