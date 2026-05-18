import { Record } from "@servicenow/sdk/core";

export const ktmDocumentationArticle = Record({
  $id: Now.ID["ktm-documentation-article"],
  table: "kb_knowledge",
  data: {
    short_description: "Knowledge Trust Manager (KTM) — Application Documentation",
    kb_knowledge_base: "a7e8a78bff0221009b20ffffffffff17",
    text: Now.include("../server/appDocumentation.html"),
    article_type: "text",
    workflow_state: "published",
    active: true,
    description: "Comprehensive documentation for the Knowledge Trust Manager application including data model, REST API, business rules, security model, UI workspace, and configuration.",
    meta_description: "Documentation for the Knowledge Trust Manager (KTM) ServiceNow application - review workflows, analytics, AI triage, and multi-source knowledge management.",
    topic: "General"
  }
});
