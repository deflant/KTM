import {
    Table,
    StringColumn,
    BooleanColumn,
    IntegerColumn,
    ReferenceColumn,
    DateTimeColumn,
    UrlColumn,
} from '@servicenow/sdk/core';

/**
 * Knowledge Review Record — tracks review state, freshness, and reviewer
 * assignments for knowledge articles from BOTH kb_knowledge AND external
 * content connector documents (Confluence Cloud, SharePoint, etc.).
 */
export const x_snc_knowledge_tr_review_record = Table({
    name: 'x_snc_knowledge_tr_review_record',
    label: 'Knowledge Review Record',
    display: 'display_title',
    accessible_from: 'package_private',
    allow_web_service_access: true,
    audit: true,
    text_index: true,
    actions: ['create', 'read', 'update', 'delete'],
    schema: {
        // --- KB Knowledge reference (optional — null for external-only docs) ---
        article: ReferenceColumn({
            label: 'Article',
            referenceTable: 'kb_knowledge',
            mandatory: false,
            cascadeRule: 'cascade',
        }),
        // --- External document fields (populated for connector content) ---
        external_doc_id: StringColumn({
            label: 'External Document ID',
            maxLength: 255,
        }),
        external_doc_title: StringColumn({
            label: 'External Document Title',
            maxLength: 500,
        }),
        external_doc_url: UrlColumn({
            label: 'External Document URL',
        }),
        external_doc_table: StringColumn({
            label: 'External Document Table',
            maxLength: 255,
        }),
        // --- Computed display field ---
        display_title: StringColumn({
            label: 'Display Title',
            maxLength: 500,
        }),
        // --- Review workflow fields ---
        review_status: StringColumn({
            label: 'Review Status',
            mandatory: true,
            maxLength: 40,
            default: 'pending_review',
            dropdown: 'dropdown_without_none',
            choices: {
                pending_review: { label: 'Pending Review', sequence: 0 },
                in_review: { label: 'In Review', sequence: 1 },
                approved: { label: 'Approved', sequence: 2 },
                modification_requested: { label: 'Modification Requested', sequence: 3 },
                re_review_needed: { label: 'Re-Review Needed', sequence: 4 },
            },
        }),
        freshness_score: StringColumn({
            label: 'Freshness Score',
            mandatory: true,
            maxLength: 20,
            default: 'fresh',
            dropdown: 'dropdown_without_none',
            choices: {
                fresh: { label: 'Fresh', sequence: 0 },
                aging: { label: 'Aging', sequence: 1 },
                stale: { label: 'Stale', sequence: 2 },
            },
        }),
        last_reviewed_on: DateTimeColumn({
            label: 'Last Reviewed On',
        }),
        last_reviewed_by: ReferenceColumn({
            label: 'Last Reviewed By',
            referenceTable: 'sys_user',
        }),
        assigned_reviewer: ReferenceColumn({
            label: 'Assigned Reviewer',
            referenceTable: 'sys_user',
        }),
        reviewer_group: ReferenceColumn({
            label: 'Reviewer Group',
            referenceTable: 'sys_user_group',
        }),
        source_connector_name: StringColumn({
            label: 'Source Connector Name',
            maxLength: 255,
        }),
        source_connector_type: StringColumn({
            label: 'Source Connector Type',
            maxLength: 40,
            dropdown: 'dropdown_with_none',
            choices: {
                confluence: { label: 'Confluence', sequence: 0 },
                sharepoint: { label: 'SharePoint', sequence: 1 },
                google_drive: { label: 'Google Drive', sequence: 2 },
                web_crawler: { label: 'Web Crawler', sequence: 3 },
                servicenow_docs: { label: 'ServiceNow Docs', sequence: 4 },
                servicenow_kb: { label: 'ServiceNow KB', sequence: 5 },
            },
        }),
        last_external_update: DateTimeColumn({
            label: 'Last External Update',
        }),
        content_hash: StringColumn({
            label: 'Content Hash',
            maxLength: 64,
        }),
        review_notes: StringColumn({
            label: 'Review Notes',
            maxLength: 4000,
        }),
        days_since_last_review: IntegerColumn({
            label: 'Days Since Last Review',
            read_only: true,
        }),
        days_since_last_update: IntegerColumn({
            label: 'Days Since Last Update',
            read_only: true,
        }),
        active: BooleanColumn({
            label: 'Active',
            mandatory: true,
            default: true,
        }),
    },
    index: [
        {
            name: 'idx_article',
            element: 'article',
            unique: false,
        },
        {
            name: 'idx_external_doc',
            element: 'external_doc_id',
            unique: false,
        },
        {
            name: 'idx_status_reviewer',
            element: 'review_status',
            unique: false,
        },
        {
            name: 'idx_source_status',
            element: 'source_connector_name',
            unique: false,
        },
        {
            name: 'idx_freshness',
            element: 'freshness_score',
            unique: false,
        },
        {
            name: 'idx_active',
            element: 'active',
            unique: false,
        },
    ],
});
