import { Record } from '@servicenow/sdk/core';

/**
 * Knowledge article documenting the Knowledge Trust Manager application:
 * architecture, business value, data model, security, REST API, UI, and workflows.
 */
Record({
    $id: Now.ID['kb_ktm_documentation'],
    table: 'kb_knowledge',
    data: {
        short_description: 'Knowledge Trust Manager (KTM) — Documentation Technique & Fonctionnelle',
        kb_knowledge_base: 'dfc19531bf2021003f07e2c1ac0739ab',
        text: Now.include('../server/knowledgeArticleContent.html'),
        workflow_state: 'published',
        active: true,
        article_type: 'text',
        language: 'fr',
        topic: 'General',
        meta_description: 'Documentation complète de l\'application Knowledge Trust Manager (KTM) : architecture, enjeux métier, proposition de valeur, modèle de données, sécurité, API REST, interface utilisateur React, business rules, propriétés configurables et intégrations avec les External Content Connectors.',
        description: 'Article de documentation couvrant l\'ensemble de l\'application Knowledge Trust Manager — un espace de travail centralisé pour superviser, vérifier et maintenir la qualité des articles de connaissance issus de sources multiples (Confluence, SharePoint, ServiceNow KB).',
    },
});
