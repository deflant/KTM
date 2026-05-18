import { useState, useEffect, useCallback } from 'react';
import { fetchReviewRecords, fetchActiveConnectors } from '../services/api.js';

export default function useReviewRecords() {
    var _r = useState([]), records = _r[0], setRecords = _r[1];
    var _t = useState(0), total = _t[0], setTotal = _t[1];
    var _p = useState(1), page = _p[0], setPage = _p[1];
    var _tp = useState(1), totalPages = _tp[0], setTotalPages = _tp[1];
    var _f = useState({}), filters = _f[0], setFilters = _f[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _c = useState([]), connectors = _c[0], setConnectors = _c[1];

    var loadRecords = useCallback(function () {
        setLoading(true);
        var params = Object.assign({}, filters, { page: page, limit: 25 });
        fetchReviewRecords(params).then(function (res) {
            setRecords(res.result || []);
            setTotal(res.total || 0);
            setTotalPages(res.pages || 1);
            setLoading(false);
        }).catch(function () { setLoading(false); });
    }, [filters, page]);

    useEffect(function () { loadRecords(); }, [loadRecords]);

    useEffect(function () {
        fetchActiveConnectors().then(function (res) { setConnectors(res.result || []); }).catch(function () {});
    }, []);

    function updateFilter(key, value) {
        var newF = Object.assign({}, filters);
        if (value) { newF[key] = value; } else { delete newF[key]; }
        setFilters(newF);
        setPage(1);
    }

    return { records: records, total: total, page: page, totalPages: totalPages, loading: loading, connectors: connectors, filters: filters, setPage: setPage, updateFilter: updateFilter, refresh: loadRecords };
}
