import { ApplicationMenu, Record } from '@servicenow/sdk/core';
import {
    x_snc_knowledge_tr_consumer,
} from './roles.now';

// Application Menu — top-level navigator entry
const ktmMenu = ApplicationMenu({
    $id: Now.ID['ktm_app_menu'],
    title: 'Knowledge Trust Manager',
    hint: 'Monitor, review, and govern externally sourced knowledge articles.',
    description: 'Centralized workspace for knowledge review, approval, and modification request management.',
    active: true,
    order: 100,
    roles: [x_snc_knowledge_tr_consumer],
});

// Module: Workspace (UI Page)
Record({
    $id: Now.ID['mod_workspace'],
    table: 'sys_app_module',
    data: {
        title: 'Workspace',
        application: ktmMenu,
        link_type: 'DIRECT',
        query: 'x_snc_knowledge_tr_workspace.do',
        hint: 'Open the Knowledge Trust Manager workspace',
        active: true,
        order: 100,
        roles: ['x_snc_knowledge_tr.consumer'],
    },
});

// Separator: Data
Record({
    $id: Now.ID['mod_separator_data'],
    table: 'sys_app_module',
    data: {
        title: 'Data',
        application: ktmMenu,
        link_type: 'SEPARATOR',
        active: true,
        order: 200,
    },
});

// Module: Review Records list
Record({
    $id: Now.ID['mod_review_list'],
    table: 'sys_app_module',
    data: {
        title: 'Review Records',
        application: ktmMenu,
        link_type: 'LIST',
        name: 'x_snc_knowledge_tr_review_record',
        hint: 'All knowledge review records',
        active: true,
        order: 300,
        roles: ['x_snc_knowledge_tr.consumer'],
    },
});

// Module: Modification Requests list
Record({
    $id: Now.ID['mod_modreq_list'],
    table: 'sys_app_module',
    data: {
        title: 'Modification Requests',
        application: ktmMenu,
        link_type: 'LIST',
        name: 'x_snc_knowledge_tr_modification_request',
        hint: 'All modification requests',
        active: true,
        order: 400,
        roles: ['x_snc_knowledge_tr.consumer'],
    },
});

// Separator: Admin
Record({
    $id: Now.ID['mod_separator_admin'],
    table: 'sys_app_module',
    data: {
        title: 'Administration',
        application: ktmMenu,
        link_type: 'SEPARATOR',
        active: true,
        order: 500,
        roles: ['x_snc_knowledge_tr.admin'],
    },
});

// Module: Source Exclusions
Record({
    $id: Now.ID['mod_exclusion_list'],
    table: 'sys_app_module',
    data: {
        title: 'Source Exclusions',
        application: ktmMenu,
        link_type: 'LIST',
        name: 'x_snc_knowledge_tr_source_exclusion',
        hint: 'Manage excluded connector sources',
        active: true,
        order: 600,
        roles: ['x_snc_knowledge_tr.admin'],
    },
});
