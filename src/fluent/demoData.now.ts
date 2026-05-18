import { Record } from '@servicenow/sdk/core';

// ============================================================
// SOURCE EXCLUSION DEMO DATA (standalone, no cross-table deps)
// ============================================================

Record({
    $id: Now.ID['demo_exclusion_1'],
    table: 'x_snc_knowledge_tr_source_exclusion',
    $meta: { installMethod: 'demo' },
    data: {
        source_name: 'ServiceNow Product Documentation',
        exclusion_reason: 'Out of scope — official ServiceNow docs maintained separately by ServiceNow.',
        active: true,
    },
});

Record({
    $id: Now.ID['demo_exclusion_2'],
    table: 'x_snc_knowledge_tr_source_exclusion',
    $meta: { installMethod: 'demo' },
    data: {
        source_name: 'ServiceNow Developer Documentation',
        exclusion_reason: 'Out of scope — developer docs maintained separately by ServiceNow.',
        active: true,
    },
});

// NOTE: Review Record and Modification Request demo data are not included
// because they require existing kb_knowledge records from External Content
// Connectors. These records will be created dynamically by:
// 1. The "New Article Sync Detector" scheduled job (creates review records)
// 2. Reviewer actions (creates modification requests)
// Run the scheduled job after installing to populate review records from
// any existing connector-sourced kb_knowledge articles on your instance.
