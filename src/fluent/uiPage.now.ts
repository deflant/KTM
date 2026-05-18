import { UiPage } from '@servicenow/sdk/core';
import page from '../client/index.html';

export const x_snc_knowledge_tr_workspace = UiPage({
    $id: Now.ID['ktm_workspace_page'],
    endpoint: 'x_snc_knowledge_tr_workspace.do',
    html: page,
    direct: true,
});
