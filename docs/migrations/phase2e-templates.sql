-- Phase 2E: Templates (PostgreSQL)
-- Adds branching to knowledge_versions and marketplace listing table

-- 1) KnowledgeVersion branching
ALTER TABLE knowledge_versions
  ADD COLUMN IF NOT EXISTS branch_name TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS parent_version_id TEXT NULL;

-- Optional index for branch filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_versions_branch
  ON knowledge_versions(knowledge_id, branch_name, version_number DESC);

-- Backfill existing rows to default branch
UPDATE knowledge_versions SET branch_name = 'main' WHERE branch_name IS NULL OR branch_name = '';

-- 2) Template listings (marketplace)
DO $$ BEGIN
  CREATE TYPE templatevisibility AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC', 'UNLISTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE templatestatus AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS template_listings (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id),
  visibility templatevisibility NOT NULL DEFAULT 'PRIVATE',
  status templatestatus NOT NULL DEFAULT 'DRAFT',
  title TEXT NOT NULL,
  description TEXT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_listings_ws ON template_listings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_template_listings_vis_status ON template_listings(visibility, status);

