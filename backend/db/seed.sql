-- ============================================
-- SEED DATA FOR PROJECTFLOW
-- ============================================
-- 
-- Demo Credentials (all passwords: Password123)
-- ┌─────────────────────────────┬──────────┐
-- │ Email                       │ Role     │
-- ├─────────────────────────────┼──────────┤
-- │ admin@acme.com              │ admin    │
-- │ member@acme.com             │ member   │
-- │ viewer@acme.com             │ viewer   │
-- └─────────────────────────────┴──────────┘
-- ============================================

-- Clean up existing data
TRUNCATE users, organizations, organization_members, workspaces, workspace_members, projects, tasks, activity_logs, refresh_tokens RESTART IDENTITY CASCADE;

-- bcrypt hash for 'Password123' (10 rounds)
-- $2a$10$YSrTGy6ovqWJnreB7OhGU.mEsok4is3mdM6Nn2D6GxQHOQfQUQayq

WITH 
-- 1. Create three users
inserted_users AS (
    INSERT INTO users (name, email, password_hash, is_verified)
    VALUES 
        ('Alice Admin',  'admin@acme.com',  '$2a$10$YSrTGy6ovqWJnreB7OhGU.mEsok4is3mdM6Nn2D6GxQHOQfQUQayq', true),
        ('Bob Member',   'member@acme.com', '$2a$10$YSrTGy6ovqWJnreB7OhGU.mEsok4is3mdM6Nn2D6GxQHOQfQUQayq', true),
        ('Carol Viewer', 'viewer@acme.com', '$2a$10$YSrTGy6ovqWJnreB7OhGU.mEsok4is3mdM6Nn2D6GxQHOQfQUQayq', true)
    RETURNING id, name, email
),
-- 2. Create Organization (owned by Alice)
inserted_org AS (
    INSERT INTO organizations (name, slug, created_by)
    SELECT 'Acme Corp', 'acme-corp', id FROM inserted_users WHERE email = 'admin@acme.com'
    RETURNING id
),
-- 3. Link all three users with correct roles
inserted_memberships AS (
    INSERT INTO organization_members (user_id, organization_id, role)
    SELECT u.id, o.id,
        CASE u.email
            WHEN 'admin@acme.com'  THEN 'admin'::member_role
            WHEN 'member@acme.com' THEN 'member'::member_role
            WHEN 'viewer@acme.com' THEN 'viewer'::member_role
        END
    FROM inserted_users u, inserted_org o
    RETURNING user_id, organization_id
),
-- 4. Create Workspaces (owned by Alice)
inserted_workspaces AS (
    INSERT INTO workspaces (organization_id, name, created_by)
    SELECT o.id, w.name, u.id
    FROM inserted_org o, 
         inserted_users u,
         (VALUES ('Design Team'), ('Engineering')) AS w(name)
    WHERE u.email = 'admin@acme.com'
    RETURNING id, name
),
-- 4b. Link admin to workspaces
inserted_workspace_members AS (
    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, u.id, 'admin'
    FROM inserted_workspaces w, inserted_users u
    WHERE u.email = 'admin@acme.com'
),
-- 5. Create Projects (created by Alice)
inserted_projects AS (
    INSERT INTO projects (workspace_id, organization_id, name, description, created_by)
    SELECT 
        w.id, 
        o.id, 
        p.name, 
        p.description, 
        u.id
    FROM inserted_users u, inserted_org o, inserted_workspaces w,
    (VALUES 
        ('Design Team', 'Logo Redesign', 'Creating a modern logo for Acme Corp'),
        ('Design Team', 'Website UI', 'Designing the main dashboard and landing page'),
        ('Engineering', 'API Refactor', 'Optimizing core API endpoints for performance'),
        ('Engineering', 'Database Migration', 'Migrating legacy data to the new PostgreSQL schema')
    ) AS p(workspace_name, name, description)
    WHERE w.name = p.workspace_name
      AND u.email = 'admin@acme.com'
    RETURNING id, name, organization_id, created_by
),
-- 6. Create Tasks (some by Alice, some assigned to Bob)
inserted_tasks AS (
    INSERT INTO tasks (project_id, organization_id, title, description, status, priority, assigned_to, created_by, due_date)
    SELECT 
        p.id, 
        p.organization_id, 
        t.title, 
        t.description, 
        t.status::task_status, 
        t.priority::task_priority,
        CASE WHEN t.assign_to_member THEN (SELECT id FROM inserted_users WHERE email = 'member@acme.com') ELSE NULL END,
        p.created_by,
        NOW() + (interval '1 day' * t.due_offset)
    FROM inserted_projects p,
    (VALUES 
        ('Logo Redesign', 'Initial Sketches',   'Hand-drawn concepts for the logo',          'done',        'high',   false, -2),
        ('Logo Redesign', 'Client Feedback',     'Review sketches with the stakeholders',     'in_progress', 'medium', true,   1),
        ('Logo Redesign', 'Final Export',         'Export SVG and PNG assets',                 'todo',        'low',    false,  5),
        
        ('Website UI',    'Wireframes',          'Low-fidelity wireframes for the dashboard', 'done',        'high',   false, -3),
        ('Website UI',    'Prototype',           'Interactive Figma prototype',               'in_progress', 'high',   true,   2),
        ('Website UI',    'Style Guide',         'Define typography and color palette',       'todo',        'medium', false,  4),
        
        ('API Refactor',  'Endpoint Audit',      'Identify slow endpoints',                   'done',        'medium', true,  -1),
        ('API Refactor',  'Auth Middleware',      'Refactor JWT authentication logic',         'in_progress', 'high',   true,   3),
        ('API Refactor',  'Unit Tests',          'Write tests for the new API layer',         'todo',        'medium', false,  7),
        
        ('Database Migration', 'Schema Review',  'Analyze current SQL schema',                'done',        'medium', false, -4),
        ('Database Migration', 'Data Mapping',    'Map old fields to new ones',                'in_progress', 'medium', true,   0),
        ('Database Migration', 'Deployment Plan', 'Plan for zero-downtime migration',         'todo',        'high',   false,  6)
    ) AS t(project_name, title, description, status, priority, assign_to_member, due_offset)
    WHERE p.name = t.project_name
    RETURNING id, title, organization_id, created_by
),
-- 7. Activity Logs for Project Creation
project_logs AS (
    INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
    SELECT 
        organization_id, 
        created_by, 
        'project.created', 
        'project', 
        id, 
        jsonb_build_object('projectName', name)
    FROM inserted_projects
),
-- 8. Activity Logs for Task Creation
task_logs AS (
    INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
    SELECT 
        organization_id, 
        created_by, 
        'task.created', 
        'task', 
        id, 
        jsonb_build_object('taskTitle', title)
    FROM inserted_tasks
)
SELECT 'Seeding completed successfully — 3 users created (admin/member/viewer), password: Password123' AS status;
