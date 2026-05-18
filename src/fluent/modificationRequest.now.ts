import {
    Table,
    StringColumn,
    ReferenceColumn,
    DateColumn,
} from '@servicenow/sdk/core';

/**
 * Knowledge Modification Request — extends task.
 * Created by reviewers to request changes to knowledge articles.
 * Lifecycle: Draft → Submitted → In Progress → Resolved / Rejected / Cancelled
 */
export const x_snc_knowledge_tr_modification_request = Table({
    name: 'x_snc_knowledge_tr_modification_request',
    label: 'Knowledge Modification Request',
    extends: 'task',
    display: 'number',
    accessible_from: 'package_private',
    allow_web_service_access: true,
    audit: true,
    text_index: true,
    actions: ['create', 'read', 'update', 'delete'],
    auto_number: {
        prefix: 'KMR',
        number: 1000,
        number_of_digits: 7,
    },
    schema: {
        review_record: ReferenceColumn({
            label: 'Review Record',
            referenceTable: 'x_snc_knowledge_tr_review_record',
            mandatory: true,
            cascadeRule: 'clear',
        }),
        modification_type: StringColumn({
            label: 'Modification Type',
            mandatory: true,
            maxLength: 40,
            default: 'content_update',
            dropdown: 'dropdown_without_none',
            choices: {
                content_update: { label: 'Content Update', sequence: 0 },
                factual_correction: { label: 'Factual Correction', sequence: 1 },
                outdated_info: { label: 'Outdated Information', sequence: 2 },
                missing_section: { label: 'Missing Section', sequence: 3 },
                formatting_issue: { label: 'Formatting Issue', sequence: 4 },
                retire_article: { label: 'Retire Article', sequence: 5 },
            },
        }),
        target_resolution_date: DateColumn({
            label: 'Target Resolution Date',
        }),
        resolution_summary: StringColumn({
            label: 'Resolution Summary',
            maxLength: 4000,
        }),
        requested_by_reviewer: ReferenceColumn({
            label: 'Requested By Reviewer',
            referenceTable: 'sys_user',
            mandatory: true,
        }),
    },
    index: [
        {
            name: 'idx_review_record',
            element: 'review_record',
            unique: false,
        },
        {
            name: 'idx_mod_type',
            element: 'modification_type',
            unique: false,
        },
    ],
});
