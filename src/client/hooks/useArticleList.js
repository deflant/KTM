import { useState, useEffect, useCallback } from 'react';
import { fetchArticleList } from '../services/api.js';

export default function useArticleList(excludedSources) {
    var _r = useState([]), records = _r[0], setRecords = _r[1];
    var _t = useState(0), total = _t[0], setTotal = _t[1];
    var _p = useState(1), page = _p[0], setPage = _p[1];
    var _tp = useState(1), totalPages = _tp[0], setTotalPages = _tp[1];
    var _f = useState({}), filters = _f[0], setFilters = _f[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];

    var loadRecords = useCallback(function () {
        setLoading(true);
        var params = Object.assign({}, filters, { page: page, limit: 25, excludedSources: excludedSources });
        fetchArticleList(params).then(function (res) {
            setRecords(Array.isArray(res.result) ? res.result : []);
            setTotal(res.total || 0);
            setTotalPages(res.pages || 1);
            setLoading(false);
        }).catch(function (err) {
            setRecords([]);
            setTotal(0);
            setLoading(false);
        });
    }, [filters, page, excludedSources]);

    useEffect(function () { loadRecords(); }, [loadRecords]);

    function updateFilter(key, value) {
        var newF = Object.assign({}, filters);
        if (value) { newF[key] = value; } else { delete newF[key]; }
        setFilters(newF);
        setPage(1);
    }

    function clearFilters() {
        setFilters({});
        setPage(1);
    }

    return {
        records: records,
        total: total,
        page: page,
        totalPages: totalPages,
        loading: loading,
        filters: filters,
        setPage: setPage,
        updateFilter: updateFilter,
        clearFilters: clearFilters,
        refresh: loadRecords,
    };
}
