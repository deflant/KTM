import { CrossScopePrivilege } from '@servicenow/sdk/core';

/**
 * Cross-scope privileges for reading External Content Connector tables.
 * Required so our scoped app can query connector configuration and document data.
 */

// Read access to the connector summary table (lists all active connectors)
CrossScopePrivilege({
    $id: Now.ID['csp_read_conn_summary'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sn_ext_conn_admin_connector_summary',
    targetScope: 'sn_ext_conn_admin',
    targetType: 'sys_db_object',
});

// Read access to Confluence Cloud external search schema (document content)
CrossScopePrivilege({
    $id: Now.ID['csp_read_cc_schema'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sn_ext_conn_cc_external_search_schema',
    targetScope: 'sn_ext_conn_cc',
    targetType: 'sys_db_object',
});

// Read access to SharePoint Online external search schema
CrossScopePrivilege({
    $id: Now.ID['csp_read_sp_schema'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sn_ext_conn_sp_external_search_schema',
    targetScope: 'sn_ext_conn_sp',
    targetType: 'sys_db_object',
});

// Read access to Web Crawler external search schema
CrossScopePrivilege({
    $id: Now.ID['csp_read_wc_schema'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sn_ext_conn_wc_external_search_schema',
    targetScope: 'sn_ext_conn_wc',
    targetType: 'sys_db_object',
});

// Read access to ServiceNow Docs external search schema
CrossScopePrivilege({
    $id: Now.ID['csp_read_sn_docs_schema'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sn_ext_conn_sn_docs_external_search_schema',
    targetScope: 'sn_ext_conn_sn_docs',
    targetType: 'sys_db_object',
});

// Read access to the base external search content virtual table
CrossScopePrivilege({
    $id: Now.ID['csp_read_ext_search_base'],
    status: 'allowed',
    operation: 'read',
    targetName: 'v_ais_external_search_content',
    targetScope: 'global',
    targetType: 'sys_db_object',
});

// Read access to search context config table
CrossScopePrivilege({
    $id: Now.ID['csp_read_search_config'],
    status: 'allowed',
    operation: 'read',
    targetName: 'sys_search_context_config',
    targetScope: 'global',
    targetType: 'sys_db_object',
});
