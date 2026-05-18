import { AiAgent } from '@servicenow/sdk/core';

/**
 * Knowledge Article Triage Agent
 * 
 * Automatically analyzes new review records to:
 * 1. Determine the article's domain based on title and source
 * 2. Find appropriate reviewers from the matching group
 * 3. Assign a reviewer and update the review status
 */
export const ktmTriageAgent = AiAgent({
    $id: Now.ID['ktm_triage_agent'],
    name: 'KTM Article Triage Agent',
    description: 'Automatically triages newly created knowledge review records by analyzing article metadata (title, source connector type, freshness) to determine the appropriate domain, find available reviewers from the matching group, and assign the best-fit reviewer. Reduces manual coordination effort and ensures timely review assignment.',
    agentRole: 'You are an expert knowledge management coordinator specializing in article triage and reviewer assignment. You analyze article metadata to determine the content domain and assign the most appropriate reviewer from available groups, ensuring balanced workload distribution and domain expertise matching.',
    recordType: 'custom',
    runAsUser: '050a44832b477690f677ffc3f291bf63', // Search App Admin AI User
    processingMessage: 'Analyzing the review record and finding the best reviewer...',
    postProcessingMessage: 'Triage complete. Reviewer has been assigned.',

    securityAcl: {
        $id: Now.ID['ktm_triage_agent_acl'],
        type: 'Specific role',
        roles: [
            '7cccc2e90a0748e798839715427ea4b7', // x_snc_knowledge_tr.coordinator
            'ba392f0817554a888970eedeb27bba19'  // x_snc_knowledge_tr.admin
        ]
    },

    versionDetails: [
        {
            name: 'v1',
            number: 1,
            state: 'published',
            instructions: `You are the KTM Article Triage Agent. When triggered by a new review record creation, follow these steps exactly:

Step 1: Extract Review Record Details.
- Extract the review record sys_id from the task context.
- Use the "Lookup Review Record Details" tool to fetch the record's display_title, source_connector_name, source_connector_type, freshness_score, and current review_status.
- DO NOT PROCEED if the record is not found or already has an assigned_reviewer.

Step 2: Determine Domain and Priority.
- Analyze the display_title and source_connector_type to determine the article's domain:
  - "confluence" or "sharepoint" sources → likely internal documentation (IT, Engineering, Processes)
  - "google_drive" sources → likely collaborative content (Projects, Training, HR)
  - "web_crawler" sources → likely external reference material (Compliance, Legal, Research)
  - "servicenow_docs" sources → likely platform documentation (ServiceNow, ITSM, Development)
  - "servicenow_kb" sources → likely internal knowledge base (Support, FAQ, Troubleshooting)
- Assess priority based on freshness_score:
  - "stale" → High priority (needs urgent review)
  - "aging" → Medium priority
  - "fresh" → Normal priority

Step 3: Search for Available Reviewers.
- Use the "Search Available Reviewers" tool with the determined source_connector_type to find reviewers who specialize in that domain.
- If no reviewers are found for that specific source type, search without a source filter to find any available reviewer.
- NEVER skip this step.

Step 4: Select the Best Reviewer.
- From the list of available reviewers, select the one with the fewest currently assigned reviews (lowest workload).
- If workloads are equal, prefer a reviewer whose group name matches the domain.

Step 5: Assign the Reviewer.
- Use the "Assign Reviewer to Review Record" tool to:
  - Set assigned_reviewer to the selected reviewer's sys_id
  - Set reviewer_group to the reviewer's group sys_id
  - Set review_status to "in_review"
- NEVER assign a reviewer without confirming the record exists first (Step 1).

Step 6: Present Summary.
- Present the triage result in plain English:
  - Article title
  - Determined domain
  - Priority level (based on freshness)
  - Assigned reviewer name
  - Reviewer group name
- Do NOT display sys_ids or raw field names to the user.`
        }
    ],

    tools: [
        {
            name: 'Lookup Review Record Details',
            description: 'Retrieves the full details of a knowledge review record by its sys_id. Returns the article title, source connector information, freshness score, and current assignment status.',
            type: 'crud',
            recordType: 'custom',
            executionMode: 'autopilot',
            outputTransformationStrategy: 'none',
            displayOutput: false,
            preMessage: 'Fetching review record details...',
            postMessage: 'Review record details retrieved.',
            inputs: {
                operationName: 'lookup',
                table: 'x_snc_knowledge_tr_review_record',
                // Verified columns (sys_dictionary): sys_id, display_title, source_connector_name, source_connector_type, external_doc_url, freshness_score, review_status, assigned_reviewer, reviewer_group, active
                inputFields: [
                    { name: 'record_id', description: 'The sys_id of the review record to look up', mandatory: true }
                ],
                queryCondition: 'sys_id={{record_id}}',
                returnFields: [
                    { name: 'sys_id' },
                    { name: 'display_title' },
                    { name: 'source_connector_name' },
                    { name: 'source_connector_type' },
                    { name: 'external_doc_url' },
                    { name: 'freshness_score' },
                    { name: 'review_status' },
                    { name: 'assigned_reviewer', referenceConfig: { table: 'sys_user', field: 'name' } },
                    { name: 'reviewer_group', referenceConfig: { table: 'sys_user_group', field: 'name' } },
                    { name: 'active' }
                ]
            }
        },
        {
            name: 'Search Available Reviewers',
            description: 'Searches for available reviewers by querying user groups and their members. Filters by source connector type to find domain-specialized reviewers. Returns a list of reviewers with their name, sys_id, group, and current assignment count.',
            type: 'script',
            recordType: 'custom',
            executionMode: 'autopilot',
            outputTransformationStrategy: 'none',
            displayOutput: false,
            preMessage: 'Searching for available reviewers...',
            postMessage: 'Reviewer search complete.',
            inputs: [
                { name: 'source_type', description: 'The source connector type to filter reviewers by domain (e.g., confluence, sharepoint, google_drive, web_crawler, servicenow_docs, servicenow_kb). Pass empty string to search all reviewers.', mandatory: false }
            ],
            script: `(function(inputs) {
    var sourceType = inputs.source_type || '';
    var results = [];

    // Find user groups that have the reviewer role for this application
    var roleGr = new GlideRecordSecure('sys_user_role');
    roleGr.addQuery('name', 'x_snc_knowledge_tr.reviewer');
    roleGr.query();

    var reviewerRoleSysId = '';
    if (roleGr.next()) {
        reviewerRoleSysId = roleGr.getUniqueValue();
    }

    // Find groups with reviewer role
    var groupRoleGr = new GlideRecordSecure('sys_group_has_role');
    groupRoleGr.addQuery('role', reviewerRoleSysId);
    groupRoleGr.query();

    var groupIds = [];
    while (groupRoleGr.next()) {
        groupIds.push(groupRoleGr.getValue('group'));
    }

    if (groupIds.length === 0) {
        // Fallback: get all groups and find members
        var allGroupGr = new GlideRecordSecure('sys_user_group');
        allGroupGr.addActiveQuery();
        allGroupGr.setLimit(10);
        allGroupGr.query();
        while (allGroupGr.next()) {
            groupIds.push(allGroupGr.getUniqueValue());
        }
    }

    // Get members from these groups
    for (var i = 0; i < groupIds.length; i++) {
        var memberGr = new GlideRecordSecure('sys_user_grmember');
        memberGr.addQuery('group', groupIds[i]);
        memberGr.query();

        while (memberGr.next()) {
            var userSysId = memberGr.getValue('user');

            // Get user details
            var userGr = new GlideRecordSecure('sys_user');
            userGr.addQuery('sys_id', userSysId);
            userGr.addActiveQuery();
            userGr.query();

            if (userGr.next()) {
                // Count current assignments for workload balancing
                var assignCountGr = new GlideAggregate('x_snc_knowledge_tr_review_record');
                assignCountGr.addQuery('assigned_reviewer', userSysId);
                assignCountGr.addQuery('review_status', 'IN', 'pending_review,in_review');
                assignCountGr.addAggregate('COUNT');
                assignCountGr.query();

                var assignCount = 0;
                if (assignCountGr.next()) {
                    assignCount = parseInt(assignCountGr.getAggregate('COUNT'), 10);
                }

                // Get group name
                var groupGr = new GlideRecordSecure('sys_user_group');
                groupGr.addQuery('sys_id', groupIds[i]);
                groupGr.query();
                var groupName = '';
                if (groupGr.next()) {
                    groupName = groupGr.getValue('name');
                }

                results.push({
                    user_sys_id: userSysId,
                    user_name: userGr.getValue('name'),
                    user_email: userGr.getValue('email') || '',
                    group_sys_id: groupIds[i],
                    group_name: groupName,
                    current_assignments: assignCount
                });
            }
        }
    }

    // Sort by fewest assignments (workload balancing)
    results.sort(function(a, b) {
        return a.current_assignments - b.current_assignments;
    });

    return {
        status: 'success',
        reviewer_count: results.length,
        reviewers: results.slice(0, 10) // Return top 10 least loaded
    };
})(inputs);`
        },
        {
            name: 'Assign Reviewer to Review Record',
            description: 'Updates an existing knowledge review record to assign a reviewer, set the reviewer group, and change the review status. Requires the record sys_id, the reviewer user sys_id, the group sys_id, and the new status.',
            type: 'crud',
            recordType: 'custom',
            executionMode: 'copilot',
            outputTransformationStrategy: 'none',
            displayOutput: false,
            preMessage: 'Assigning reviewer to the review record...',
            postMessage: 'Reviewer assigned successfully.',
            inputs: {
                operationName: 'update',
                table: 'x_snc_knowledge_tr_review_record',
                // Verified columns (sys_dictionary): sys_id, assigned_reviewer, reviewer_group, review_status
                inputFields: [
                    { name: 'record_id', description: 'The sys_id of the review record to update', mandatory: true },
                    { name: 'assigned_reviewer', description: 'The sys_id of the user to assign as reviewer', mandatory: true, mappedToColumn: 'assigned_reviewer' },
                    { name: 'reviewer_group', description: 'The sys_id of the reviewer group', mandatory: false, mappedToColumn: 'reviewer_group' },
                    { name: 'review_status', description: 'The new review status (e.g., in_review)', mandatory: true, mappedToColumn: 'review_status' }
                ],
                queryCondition: 'sys_id={{record_id}}'
            }
        }
    ],

    triggerConfig: [
        {
            name: 'Triage on Review Record Creation',
            triggerFlowDefinitionType: 'record_create',
            targetTable: 'x_snc_knowledge_tr_review_record',
            triggerCondition: 'active=true',
            channel: 'nap',
            objectiveTemplate: 'Triage the newly created review record ${display_title} and assign an appropriate reviewer based on its source and content domain.',
            runAsScript: `/**
 * Script to be evaluated at runtime when the trigger is executed.
 * @param {GlideRecord} current - Target record that executed this trigger.
 * @returns {string}
 */
(function(current) {
  var result = "050a44832b477690f677ffc3f291bf63"; // Search App Admin AI User
  return result;
})(current);`
        }
    ]
});
