import {
    Table,
    StringColumn,
    UrlColumn,
    DateTimeColumn,
    BooleanColumn,
    ReferenceColumn,
} from '@servicenow/sdk/core';

/**
 * Liste des articles — stores the title and link of every article
 * retrieved via Sync Connectors. Acts as a central catalog of all
 * synced external documents and internal KB articles.
 */
export const x_snc_knowledge_tr_article_list = Table({
    name: 'x_snc_knowledge_tr_article_list',
    label: 'Liste des articles',
    display: 'article_title',
    accessible_from: 'package_private',
    allow_web_service_access: true,
    audit: true,
    text_index: true,
    actions: ['create', 'read', 'update', 'delete'],
    schema: {
        // --- Core fields ---
        article_title: StringColumn({
            label: 'Titre de l\'article',
            mandatory: true,
            maxLength: 500,
        }),
        article_url: UrlColumn({
            label: 'Lien vers l\'article',
        }),
        // --- Source tracking ---
        external_doc_id: StringColumn({
            label: 'External Document ID',
            maxLength: 255,
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
        // --- Link to review record ---
        review_record: ReferenceColumn({
            label: 'Review Record',
            referenceTable: 'x_snc_knowledge_tr_review_record',
            cascadeRule: 'clear',
        }),
        // --- Timestamps ---
        synced_on: DateTimeColumn({
            label: 'Synced On',
        }),
        last_external_update: DateTimeColumn({
            label: 'Last External Update',
        }),
        // --- Active flag ---
        active: BooleanColumn({
            label: 'Active',
            mandatory: true,
            default: true,
        }),
    },
    index: [
        {
            name: 'idx_external_doc_id',
            element: 'external_doc_id',
            unique: false,
        },
        {
            name: 'idx_source_connector',
            element: 'source_connector_name',
            unique: false,
        },
        {
            name: 'idx_active',
            element: 'active',
            unique: false,
        },
    ],
});
