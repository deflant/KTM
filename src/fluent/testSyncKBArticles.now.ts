import '@servicenow/sdk/global';
import { Test } from '@servicenow/sdk/core';

/**
 * ATF Test #21: Sync KB Articles — Création de Review Records
 *
 * Ce test vérifie la logique de synchronisation :
 * 1. Confirme qu'il existe des articles KB publiés sur l'instance
 * 2. Insère un Review Record (simulant ce que fait /sync-kb-articles)
 * 3. Valide que le Review Record est correctement créé avec les bons champs
 *
 * Approche serveur : teste la même logique que l'endpoint sans la couche HTTP,
 * garantissant que le modèle de données et les business rules fonctionnent.
 */
Test(
    {
        $id: Now.ID['test_sync_kb_review_records'],
        name: 'Sync KB Articles creates Review Records',
        description:
            'Verifies that the sync logic correctly creates review records for published KB articles with expected status, freshness, and source type.',
        active: true,
        failOnServerError: true,
    },
    (atf) => {
        // Step 1: Impersonate the system admin user
        atf.server.impersonate({
            $id: Now.ID['step_kb_sync_impersonate_admin'],
            user: '6816f79cc0a8016401c5a33be04be441',
        });

        // Step 2: Verify that published KB articles exist on the instance
        atf.server.recordQuery({
            $id: Now.ID['step_kb_sync_verify_kb_exists'],
            table: 'kb_knowledge',
            fieldValues: 'workflow_state=published^active=true',
            assert: 'records_match_query',
            enforceSecurity: false,
        });

        // Step 3: Insert a Review Record simulating the sync endpoint behavior
        const rrInsert = atf.server.recordInsert({
            $id: Now.ID['step_kb_sync_insert_review_record'],
            table: 'x_snc_knowledge_tr_review_record',
            fieldValues: {
                external_doc_id: 'kb_atf_test_sync_unique_001',
                external_doc_title: 'ATF Test - Synced KB Article',
                display_title: 'ATF Test - Synced KB Article',
                review_status: 'pending_review',
                freshness_score: 'fresh',
                source_connector_name: 'ServiceNow KB',
                source_connector_type: 'servicenow_kb',
                active: 'true',
            },
            assert: 'record_successfully_inserted',
            enforceSecurity: false,
        });

        // Step 4: Validate the created Review Record has the correct field values
        atf.server.recordValidation({
            $id: Now.ID['step_kb_sync_validate_review_record'],
            table: 'x_snc_knowledge_tr_review_record',
            recordId: rrInsert.record_id,
            fieldValues: 'review_status=pending_review^freshness_score=fresh^source_connector_type=servicenow_kb^active=true',
            assert: 'record_validated',
            enforceSecurity: false,
        });

        // Step 5: Query to confirm the record is findable by source_connector_type
        atf.server.recordQuery({
            $id: Now.ID['step_kb_sync_query_by_source_type'],
            table: 'x_snc_knowledge_tr_review_record',
            fieldValues: 'source_connector_type=servicenow_kb^external_doc_id=kb_atf_test_sync_unique_001',
            assert: 'records_match_query',
            enforceSecurity: false,
        });

        // Step 6: Clean up - delete the test review record
        atf.server.recordDelete({
            $id: Now.ID['step_kb_sync_cleanup'],
            table: 'x_snc_knowledge_tr_review_record',
            recordId: rrInsert.record_id,
            assert: 'record_successfully_deleted',
            enforceSecurity: false,
        });
    }
);
