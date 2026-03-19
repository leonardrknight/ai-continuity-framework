-- Three-Plane Knowledge: Roles and Humans tables
-- Applied live via `supabase db push` on 2026-03-19

-- Roles: positions within the organization
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Identity
  title TEXT NOT NULL,
  description TEXT,
  authority_level TEXT NOT NULL,  -- founder | executive | employee | shareholder

  -- Knowledge access rules
  company_plane_scope TEXT DEFAULT 'full',  -- full | filtered | none
  company_plane_filters TEXT[],             -- topics excluded

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(org_id, title)
);

-- Humans: every person who interacts with Amigo
CREATE TABLE humans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Identity
  display_name TEXT NOT NULL,
  external_ids JSONB DEFAULT '{}',

  -- Role binding
  role_id UUID REFERENCES roles(id),
  status TEXT NOT NULL DEFAULT 'active',  -- active | departed | suspended
  departed_at TIMESTAMPTZ,

  -- Learned profile (Curator-generated, NOT static)
  summary TEXT,
  communication_style JSONB,
  interests TEXT[],
  expertise TEXT[],
  strengths TEXT[],
  growth_areas TEXT[],
  preferences JSONB,

  -- Engagement
  last_interaction TIMESTAMPTZ,
  interaction_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
