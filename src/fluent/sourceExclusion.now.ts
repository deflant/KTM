import {
    Table,
    StringColumn,
    BooleanColumn,
    ReferenceColumn,
    DateTimeColumn,
} from '@servicenow/sdk/core';

/**
 * Knowledge Source Exclusion — configuration table for excluding
 * specific connector sources (e.g., ServiceNow Product Documentation)
 * from all views and analytics.
 */
export const x_snc_knowledge_tr_source_exclusion = Table({
    name: 'x_snc_knowledge_tr_source_exclusion',
    label: 'Knowledge Source Exclusion',
    display: 'source_name',
    accessible_from: 'package_private',
    allow_web_service_access: true,
    audit: true,
    actions: ['create', 'read', 'update', 'delete'],
    schema: {
        source_name: StringColumn({
            label: 'Source Name',
            mandatory: true,
            maxLength: 255,
        }),
        exclusion_reason: StringColumn({
            label: 'Exclusion Reason',
            maxLength: 500,
        }),
        active: BooleanColumn({
            label: 'Active',
            mandatory: true,
            default: true,
        }),
        excluded_by: ReferenceColumn({
            label: 'Excluded By',
            referenceTable: 'sys_user',
        }),
        excluded_on: DateTimeColumn({
            label: 'Excluded On',
        }),
    },
    index: [
        {
            name: 'idx_source_name',
            element: 'source_name',
            unique: true,
        },
        {
            name: 'idx_active',
            element: 'active',
            unique: false,
        },
    ],
});
