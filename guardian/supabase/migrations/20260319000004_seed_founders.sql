-- Three-Plane Knowledge: Seed founder roles and humans
-- Applied live via `supabase db push` on 2026-03-19

-- Mi Amigos AI org ID (matches Guardian's repo_id / org_id)
-- Using a deterministic UUID for the org
DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ceo_role_id UUID;
  v_cto_role_id UUID;
  v_coo_role_id UUID;
BEGIN
  -- Insert roles
  INSERT INTO roles (org_id, title, description, authority_level, company_plane_scope)
  VALUES (v_org_id, 'CEO', 'Chief Executive Officer', 'founder', 'full')
  ON CONFLICT (org_id, title) DO NOTHING
  RETURNING id INTO v_ceo_role_id;

  IF v_ceo_role_id IS NULL THEN
    SELECT id INTO v_ceo_role_id FROM roles WHERE org_id = v_org_id AND title = 'CEO';
  END IF;

  INSERT INTO roles (org_id, title, description, authority_level, company_plane_scope)
  VALUES (v_org_id, 'CTO', 'Chief Technology Officer', 'founder', 'full')
  ON CONFLICT (org_id, title) DO NOTHING
  RETURNING id INTO v_cto_role_id;

  IF v_cto_role_id IS NULL THEN
    SELECT id INTO v_cto_role_id FROM roles WHERE org_id = v_org_id AND title = 'CTO';
  END IF;

  INSERT INTO roles (org_id, title, description, authority_level, company_plane_scope)
  VALUES (v_org_id, 'COO', 'Chief Operating Officer', 'founder', 'full')
  ON CONFLICT (org_id, title) DO NOTHING
  RETURNING id INTO v_coo_role_id;

  IF v_coo_role_id IS NULL THEN
    SELECT id INTO v_coo_role_id FROM roles WHERE org_id = v_org_id AND title = 'COO';
  END IF;

  -- Insert humans
  INSERT INTO humans (org_id, display_name, role_id, status)
  VALUES
    (v_org_id, 'Jeff', v_ceo_role_id, 'active'),
    (v_org_id, 'Leo', v_cto_role_id, 'active'),
    (v_org_id, 'Carlos', v_coo_role_id, 'active')
  ON CONFLICT DO NOTHING;
END $$;
