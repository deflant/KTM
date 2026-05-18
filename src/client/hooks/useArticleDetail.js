import { useState, useEffect, useCallback } from 'react';
import { fetchReviewRecordDetail, updateReviewRecord, createModificationRequest, fetchArticleUrlByReviewRecord, getCurrentUserName, fetchModRequestsByReviewRecord, fetchApprovalsByModRequests } from '../services/api.js';

export default function useArticleDetail(id) {
    var _d = useState(null), detail = _d[0], setDetail = _d[1];
    var _a = useState(null), articleInfo = _a[0], setArticleInfo = _a[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _e = useState(null), error = _e[0], setError = _e[1];
    var _notes = useState([]), notes = _notes[0], setNotes = _notes[1];
    var _modReqs = useState([]), modRequests = _modReqs[0], setModRequests = _modReqs[1];
    var _approvals = useState([]), approvals = _approvals[0], setApprovals = _approvals[1];

    var load = useCallback(function () {
        if (!id) return;
        setLoading(true);
        Promise.all([
            fetchReviewRecordDetail(id),
            fetchArticleUrlByReviewRecord(id),
            fetchModRequestsByReviewRecord(id),
        ]).then(function (results) {
            setDetail(results[0].result);
            setArticleInfo(results[1]);
            var mods = results[2] || [];
            setModRequests(mods);

            // Parse existing notes into activity entries
            var d = results[0].result;
            var entries = [];
            if (d && d.review_notes) {
                entries.push({ type: 'note', text: d.review_notes, date: d.last_reviewed_on || '', by: d.last_reviewed_by || 'System' });
            }
            if (d && d.review_status === 'approved' && d.last_reviewed_on) {
                entries.push({ type: 'approved', text: 'Article approuvé', date: d.last_reviewed_on, by: d.last_reviewed_by || '' });
            }
            setNotes(entries);

            // Fetch approvals for all mod requests
            var modIds = mods.map(function (m) { return m.sys_id; }).filter(Boolean);
            return fetchApprovalsByModRequests(modIds);
        }).then(function (approvalResults) {
            setApprovals(approvalResults || []);
            setLoading(false);
        }).catch(function (err) { setError(err.message); setLoading(false); });
    }, [id]);

    useEffect(function () { load(); }, [load]);

    function approve(notesText) {
        return getCurrentUserName().then(function (userName) {
            var now = new Date().toISOString().replace('T', ' ').substring(0, 16);
            var formatted = '[' + userName + ' | ' + now + '] ✓ Validé: ' + notesText;
            var existing = (detail && detail.review_notes) ? detail.review_notes + '\n---\n' : '';
            return updateReviewRecord(id, {
                review_status: 'approved',
                review_notes: existing + formatted,
                last_reviewed_on: now + ':00',
            });
        }).then(function () { load(); });
    }

    function requestModification(data) {
        return createModificationRequest(data).then(function () { load(); });
    }

    function requestRemoval(reason) {
        return getCurrentUserName().then(function (userName) {
            var now = new Date().toISOString().replace('T', ' ').substring(0, 16);
            var formatted = '[' + userName + ' | ' + now + '] 🗑 Retrait demandé: ' + reason;
            var existing = (detail && detail.review_notes) ? detail.review_notes + '\n---\n' : '';
            return createModificationRequest({
                review_record: id,
                short_description: 'Demande de retrait',
                description: reason,
                modification_type: 'retirement',
                priority: '2',
            }).then(function () {
                return updateReviewRecord(id, { review_status: 're_review_needed', review_notes: existing + formatted });
            });
        }).then(function () { load(); });
    }

    function addNote(noteText) {
        return getCurrentUserName().then(function (userName) {
            var now = new Date().toISOString().replace('T', ' ').substring(0, 16);
            var formatted = '[' + userName + ' | ' + now + '] ' + noteText;
            var existing = (detail && detail.review_notes) ? detail.review_notes + '\n---\n' : '';
            return updateReviewRecord(id, { review_notes: existing + formatted });
        }).then(function () { load(); });
    }

    function reassign(reviewerId) {
        return updateReviewRecord(id, { assigned_reviewer: reviewerId }).then(function () { load(); });
    }

    return {
        detail: detail,
        articleInfo: articleInfo,
        modRequests: modRequests,
        approvals: approvals,
        loading: loading,
        error: error,
        notes: notes,
        approve: approve,
        requestModification: requestModification,
        requestRemoval: requestRemoval,
        addNote: addNote,
        reassign: reassign,
        refresh: load,
    };
}
