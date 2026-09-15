# AGENTS.md — AMPERSAND

## 1. Project identity

AMPERSAND (&) is a personal Digital Content Operating System.

Its purpose is to help digital marketing and content professionals use AI to become more creative, efficient, systematic, and informed in their decision-making.

AMPERSAND is not intended to be merely an AI chat interface or a collection of disconnected AI tools. It should progressively become an integrated operating environment for managing the lifecycle of digital content:

**information → structured knowledge → insight → content creation → distribution → performance → learning**

The initial user is the project's creator, but the architecture should not unnecessarily prevent AMPERSAND from becoming a multi-user product in the future.


## 2. Product philosophy

AMPERSAND should augment professional judgment rather than attempt to replace it.

AI should be used to:

- reduce repetitive work;
- structure unstructured information;
- improve access to accumulated knowledge;
- surface useful connections and context;
- assist creative exploration;
- accelerate content production;
- support better-informed decisions.

Where appropriate, AI-generated information should be treated as a suggestion that a human can inspect, edit, approve, or reject.

Prefer workflows where automation reduces friction without removing useful human control.


## 3. Product evolution

AMPERSAND will be developed incrementally.

The architecture should support future expansion, but we should not build speculative functionality before it is needed.

### Phase 1 — Application foundation

Build the basic application scaffolding required for AMPERSAND to operate as a web application.

Expected concerns include:

- authentication;
- users;
- roles and permissions;
- projects;
- user-to-project assignment;
- separation of administration features from project-level features;
- application navigation and layout;
- database foundations;
- deployment and environment configuration.

### Phase 2 — Smart ingestion

Build an AI-assisted ingestion workflow for creating rich project documentation from source material.

The conceptual workflow is:

1. User uploads or references a source.
2. User provides unstructured information describing its context and/or content.
3. AMPERSAND processes the source and supplied context.
4. AI proposes structured metadata and enriched information.
5. User can inspect and correct the suggestions.
6. The approved information becomes part of the project's documentation database.

The ingestion system should eventually accommodate multiple source/content types rather than being tightly coupled to a single file format.

Original source material and structured/enriched metadata should remain conceptually distinct.


### Phase 3 — Knowledge retrieval

Make accumulated project documentation intelligently searchable.

Semantic/vector search and embeddings are expected to be explored.

Supabase's vector/embedding capabilities are currently a candidate, NOT a permanent architectural decision.

The system should preserve enough separation between stored source data, structured metadata, and retrieval/indexing infrastructure that retrieval strategies can evolve later.


### Phase 4 — AI interaction and content generation

Create an AI interface through which users can interact with project knowledge.

The interface should eventually support:

- asking questions about project documentation;
- retrieving relevant sources and context;
- generating derivative content;
- transforming existing material;
- assisting research and ideation;
- producing content grounded in project knowledge.

Where possible, generated answers and content should retain traceability to their underlying project sources.


### Future phases

Potential future modules include content analytics and performance intelligence.

AMPERSAND may eventually connect published content with performance data from external platforms so that historical results can inform future content decisions.

These capabilities are future direction, not current implementation requirements.


## 4. Core domain principles

### Projects are first-class entities

AMPERSAND should be project-oriented.

Content, documentation, knowledge, conversations, generated assets, analytics, and other future resources should generally have explicit project ownership or association where appropriate.


### Administration and project work are separate concerns

Maintain a clear conceptual and technical distinction between:

- application/admin functionality;
- project-level functionality.

Administrative functionality may include users, roles, project creation, assignments, system configuration, and other cross-project concerns.

Project functionality operates within the context of a selected project.


### Preserve source provenance

AMPERSAND is intended to become a knowledge system, not simply a content repository.

Where practical, preserve relationships between:

- original sources;
- extracted information;
- user-provided context;
- AI-generated enrichment;
- human-approved structured data;
- derivative/generated content.

Do not destroy provenance merely to simplify implementation.


### Structured data and source material are different layers

Do not assume that uploaded files themselves constitute the knowledge model.

The architecture should allow AMPERSAND to preserve original assets while maintaining structured entities and metadata derived from them.


### AI output is not automatically truth

AI-generated metadata, classifications, summaries, relationships, and other enrichment may require human validation.

Design data models and workflows so that generated suggestions can be reviewed or corrected where appropriate.


## 5. Current technical direction

AMPERSAND is intended to be a web application accessible from different computers.

Current preferred infrastructure:

- GitHub — source control
- Vercel — application hosting/deployment
- Supabase — current preferred backend/database/auth/storage platform

These choices represent the current technical direction.

Do not introduce additional infrastructure or replace these services without explaining the reason and obtaining approval.

Technology choices that have not yet been explicitly decided should remain open.


## 6. Architecture principles

When proposing or implementing architecture:

1. Prefer simple solutions appropriate to the current phase.
2. Avoid premature abstraction.
3. Avoid premature optimization.
4. Do not build future modules merely because they may eventually be useful.
5. Do not make current implementation choices that obviously block planned future capabilities.
6. Prefer modular boundaries between major concerns.
7. Keep AI-provider-specific logic isolated where reasonably practical.
8. Keep retrieval/embedding implementation sufficiently decoupled from canonical project data.
9. Prefer explicit data relationships over information hidden exclusively inside prompts.
10. Treat database migrations and schema evolution carefully.
11. Prefer maintainability and comprehensibility over cleverness.


## 7. Development approach

The primary project owner is a digital marketing specialist rather than a professional software developer.

When discussing implementation:

- explain significant architectural decisions in accessible language;
- distinguish between product decisions and implementation details;
- explain important trade-offs before making consequential choices;
- do not assume that a technically possible feature is necessarily desirable;
- flag decisions that would be difficult or expensive to reverse;
- recommend sensible defaults when several equivalent implementation options exist.

Do not over-explain routine code changes unless requested.


## 8. Decision discipline

Before making a significant architectural decision, determine whether it is:

### DECIDED
Already established by the project.

Respect it unless there is a strong reason to reconsider it.

### PROVISIONAL
The current preferred direction, but still open to revision.

Implement it in a way that avoids unnecessary lock-in.

### UNDECIDED
No choice has been made.

Do not silently make the decision on behalf of the project.

For consequential UNDECIDED choices, explain the available options and request a decision before committing the architecture to one.


## 9. Repository and files

Repository root represents the AMPERSAND application workspace.

### `/branding`

Contains AMPERSAND/García&Smith visual reference assets, including:

- logos;
- icons;
- fonts;
- brand guidelines.

Use these assets as the source of truth when implementing AMPERSAND's visual identity.

Do not modify original branding assets unless explicitly requested.

### `/local files`

This directory contains local-only resources.

It is intentionally excluded from Git through `.gitignore`.

Never force-add, commit, move, or publish files from `/local files` unless explicitly instructed.

Do not assume that a file being accessible inside the local workspace means that it should be committed to the repository.


## 10. Git discipline

Default branch:

`main`

Remote repository:

`garciaandsmith/ampersand`

Before substantial changes:

- inspect the existing repository structure;
- understand relevant existing code before replacing it;
- preserve unrelated work;
- check Git status when appropriate.

Do not:

- force-push;
- rewrite Git history;
- delete branches;
- commit secrets;
- commit `.env` files containing credentials;
- commit `/local files`;
- perform destructive Git operations

unless explicitly instructed.

Keep commits logically scoped and use descriptive commit messages.


## 11. Security and secrets

Never hard-code credentials, API keys, service-role keys, tokens, passwords, or other secrets.

Use environment variables for secrets.

Ensure local secret files are excluded from Git.

Be particularly careful to distinguish between credentials intended for browser/client use and privileged server-side credentials.

Never expose privileged Supabase or third-party credentials to client-side code.


## 12. Documentation

Keep documentation proportional to the project.

When an architectural decision becomes durable and important, document it rather than relying exclusively on conversation history.

The repository should progressively become sufficient for a new development session to understand the current state of AMPERSAND without depending on previous chat history.

Update documentation when implementation materially changes documented architecture or workflows.


## 13. Before implementing a new feature

Before substantial implementation:

1. inspect the relevant existing code and documentation;
2. identify the product requirement being solved;
3. identify dependencies on existing architecture;
4. distinguish established decisions from assumptions;
5. flag consequential unresolved decisions;
6. propose the smallest coherent implementation;
7. only then implement.

Avoid large speculative refactors while implementing narrowly scoped features.


## 14. Current priority

The current priority is **Phase 1: Application foundation**.

Do not begin implementing ingestion, embeddings, RAG, chat, analytics, or other later-stage functionality unless explicitly requested.

However, foundational decisions should avoid unnecessarily preventing those capabilities later.


### Documentation structure

`/docs/architecture` contains documentation describing the current intended architecture of AMPERSAND.

`/docs/decisions` contains Architecture Decision Records (ADRs) explaining significant architectural and technical decisions.

Follow the conventions described in each directory's README.

When making a significant architectural change, consider whether:
1. existing architecture documentation needs updating;
2. the decision warrants a new ADR.

Do not create documentation merely for completeness. Documentation should capture information that will be useful to future development sessions.