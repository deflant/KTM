import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable.jsx';
import StatusPill from '../components/StatusPill.jsx';
import FilterBar from '../components/FilterBar.jsx';
import './ModificationRequestsPage.css';

var TABLE_API = '/api/now/table';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserToken': window.g_ck || '',
    };
}

var STATE_MAP = { '1': 'draft', '2': 'submitted', '3': 'resolved', '4': 'rejected', '7': 'cancelled', '18': 'in_progress' };
var STATE_LABELS = { '1': 'Draft', '2': 'Submitted', '3': 'Resolved', '4': 'Rejected', '7': 'Cancelled', '18': 'In Progress' };

var COLUMNS = [
    { key: 'number', label: 'Number' },
    { key: 'short_description', label: 'Description', render: function (v) { return v || '—'; } },
    { key: 'modification_type', label: 'Type', render: function (v) {
        var labels = { content_update: 'Content Update', removal: 'Removal', reassign: 'Reassign', other: 'Other' };
        return labels[v] || v || '—';
    }},
    { key: 'state', label: 'State', render: function (v) {
        var mapped = STATE_MAP[v] || v;
        return React.createElement(StatusPill, { status: mapped });
    }},
    { key: 'priority', label: 'Priority', render: function (v) {
        var labels = { '1': '1 - Critical', '2': '2 - High', '3': '3 - Moderate', '4': '4 - Low' };
        return labels[v] || v || '—';
    }},
    { key: 'assigned_to', label: 'Assigned To', render: function (v) { return v || '—'; } },
    { key: 'requested_by_reviewer', label: 'Requested By', render: function (v) { return v || '—'; } },
    { key: 'sys_created_on', label: 'Created', render: function (v) {
        if (!v) return '—';
        try { return v.substring(0, 10); } catch (e) { return v; }
    }},
];

export default function ModificationRequestsPage({ onNavigate }) {
    var _r = useState([]), records = _r[0], setRecords = _r[1];
    var _p = useState(1), page = _p[0], setPage = _p[1];
    var _tp = useState(1), totalPages = _tp[0], setTotalPages = _tp[1];
    var _f = useState({}), filters = _f[0], setFilters = _f[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _e = useState(''), error = _e[0], setError = _e[1];
    var _tc = useState(0), totalCount = _tc[0], setTotalCount = _tc[1];

    useEffect(function () {
        setLoading(true);
        setError('');

        var limit = 25;
        var offset = (page - 1) * limit;

        var queryParts = [];
        if (filters.state) queryParts.push('state=' + filters.state);
        queryParts.push('ORDERBYDESCsys_created_on');
        var query = queryParts.join('^');

        var url = new URL(TABLE_API + '/x_snc_knowledge_tr_modification_request', window.location.origin);
        url.searchParams.set('sysparm_query', query);
        url.searchParams.set('sysparm_fields', 'sys_id,number,short_description,description,modification_type,state,priority,assigned_to,requested_by_reviewer,target_resolution_date,review_record,sys_created_on');
        url.searchParams.set('sysparm_display_value', 'all');
        url.searchParams.set('sysparm_limit', String(limit));
        url.searchParams.set('sysparm_offset', String(offset));
        url.searchParams.set('sysparm_suppress_pagination_header', 'false');
        url.searchParams.set('sysparm_exclude_reference_link', 'true');

        fetch(url.toString(), { headers: getHeaders() })
            .then(function (resp) {
                var total = parseInt(resp.headers.get('X-Total-Count')) || 0;
                return resp.json().then(function (data) { return { data: data, total: total }; });
            })
            .then(function (res) {
                var rawRecords = (res.data && res.data.result) ? res.data.result : [];

                function dv(f) { return f ? (typeof f === 'string' ? f : f.display_value || f.value || '') : ''; }
                function val(f) { return f ? (typeof f === 'string' ? f : f.value || '') : ''; }

                var mapped = rawRecords.map(function (r) {
                    return {
                        sys_id: val(r.sys_id),
                        number: val(r.number),
                        short_description: val(r.short_description),
                        description: val(r.description),
                        modification_type: val(r.modification_type),
                        state: val(r.state),
                        priority: val(r.priority),
                        assigned_to: dv(r.assigned_to),
                        requested_by_reviewer: dv(r.requested_by_reviewer),
                        target_resolution_date: val(r.target_resolution_date),
                        review_record: val(r.review_record),
                        sys_created_on: val(r.sys_created_on),
                    };
                });

                var total = res.total || mapped.length;
                setRecords(mapped);
                setTotalCount(total);
                setTotalPages(Math.max(1, Math.ceil(total / limit)));
                setLoading(false);
            })
            .catch(function (err) {
                setError('Failed to load modification requests: ' + (err.message || 'Unknown error'));
                setRecords([]);
                setLoading(false);
            });
    }, [filters, page]);

    var statePills = [
        { key: 'state', value: '', label: 'All' },
        { key: 'state', value: '1', label: 'Draft' },
        { key: 'state', value: '2', label: 'Submitted' },
        { key: 'state', value: '18', label: 'In Progress' },
        { key: 'state', value: '3', label: 'Resolved' },
        { key: 'state', value: '4', label: 'Rejected' },
    ];

    function updateFilter(key, value) {
        var newF = Object.assign({}, filters);
        if (value) { newF[key] = value; } else { delete newF[key]; }
        setFilters(newF);
        setPage(1);
    }

    return (
        <div className="mod-page">
            <div className="mod-page__header">
                <h1>Modification Requests</h1>
                {totalCount > 0 && <span className="mod-page__count">{totalCount} request{totalCount !== 1 ? 's' : ''}</span>}
            </div>

            <FilterBar filters={statePills} activeFilters={filters} onFilterChange={updateFilter} />

            {error && <div className="mod-page__error">{error}</div>}

            {loading ? (
                <div className="mod-page__loading">
                    <span className="mod-page__spinner">⟳</span>
                    <p>Loading modification requests…</p>
                </div>
            ) : (
                <DataTable
                    columns={COLUMNS}
                    rows={records}
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onRowClick={function (row) { onNavigate('mod-detail', row.sys_id); }}
                />
            )}
        </div>
    );
}
