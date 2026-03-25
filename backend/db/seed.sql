-- ============================================
-- SEED DATA FOR PROJECTFLOW
-- ============================================

-- Clean up existing data (optional, but good for idempotent seeding)
TRUNCATE users, organizations, organization_members, workspaces, workspace_members, projects, tasks, activity_logs RESTART IDENTITY CASCADE;

WITH 
-- 1. Create User
inserted_user AS (
    INSERT INTO users (name, email, password_hash, is_verified)
    VALUES ('Demo User', 'demo@projectflow.com', '$2a$10$9N4.Ox1itOcnI/eR5nf0t.gjtwDTPhFfJggXczXD20K2e/Lr7pjyS', true)
    RETURNING id
),
-- 2. Create Organization
inserted_org AS (
    INSERT INTO organizations (name, slug, created_by)
    SELECT 'Acme Corp', 'acme-corp', id FROM inserted_user
    RETURNING id
),
-- 3. Link User as Admin/Owner
inserted_membership AS (
    INSERT INTO organization_members (user_id, organization_id, role)
    SELECT u.id, o.id, 'admin'
    FROM inserted_user u, inserted_org o
    RETURNING user_id, organization_id
),
-- 4. Create Workspaces
inserted_workspaces AS (
    INSERT INTO workspaces (organization_id, name, created_by)
    SELECT o.id, w.name, u.id
    FROM inserted_org o, inserted_user u, (VALUES ('Design Team'), ('Engineering')) AS w(name)
    RETURNING id, name
),
-- 4b. Link User to Workspaces
inserted_workspace_members AS (
    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, u.id, 'admin'
    FROM inserted_workspaces w, inserted_user u
),
-- 5. Create Projects
inserted_projects AS (
    INSERT INTO projects (workspace_id, organization_id, name, description, created_by)
    SELECT 
        w.id, 
        o.id, 
        p.name, 
        p.description, 
        u.id
    FROM inserted_user u, inserted_org o, inserted_workspaces w,
    (VALUES 
        ('Design Team', 'Logo Redesign', 'Creating a modern logo for Acme Corp'),
        ('Design Team', 'Website UI', 'Designing the main dashboard and landing page'),
        ('Engineering', 'API Refactor', 'Optimizing core API endpoints for performance'),
        ('Engineering', 'Database Migration', 'Migrating legacy data to the new PostgreSQL schema')
    ) AS p(workspace_name, name, description)
    WHERE w.name = p.workspace_name
    RETURNING id, name, organization_id, created_by
),
-- 6. Create Tasks
inserted_tasks AS (
    INSERT INTO tasks (project_id, organization_id, title, description, status, priority, created_by, due_date)
    SELECT 
        p.id, 
        p.organization_id, 
        t.title, 
        t.description, 
        t.status::task_status, 
        t.priority::task_priority, 
        p.created_by,
        NOW() + (interval '1 day' * t.due_offset)
    FROM inserted_projects p,
    (VALUES 
        ('Logo Redesign', 'Initial Sketches', 'Hand-drawn concepts for the logo', 'done', 'high', -2),
        ('Logo Redesign', 'Client Feedback', 'Review sketches with the stakeholders', 'in_progress', 'medium', 1),
        ('Logo Redesign', 'Final Export', 'Export SVG and PNG assets', 'todo', 'low', 5),
        
        ('Website UI', 'Wireframes', 'Low-fidelity wireframes for the dashboard', 'done', 'high', -3),
        ('Website UI', 'Prototype', 'Interactive Figma prototype', 'in_progress', 'high', 2),
        ('Website UI', 'Style Guide', 'Define typography and color palette', 'todo', 'medium', 4),
        
        ('API Refactor', 'Endpoint Audit', 'Identify slow endpoints', 'done', 'medium', -1),
        ('API Refactor', 'Auth Middleware', 'Refactor JWT authentication logic', 'in_progress', 'high', 3),
        ('API Refactor', 'Unit Tests', 'Write tests for the new API layer', 'todo', 'medium', 7),
        
        ('Database Migration', 'Schema Review', 'Analyze current SQL schema', 'done', 'medium', -4),
        ('Database Migration', 'Data Mapping', 'Map old fields to new ones', 'in_progress', 'medium', 0),
        ('Database Migration', 'Deployment Plan', 'Plan for zero-downtime migration', 'todo', 'high', 6)
    ) AS t(project_name, title, description, status, priority, due_offset)
    WHERE p.name = t.project_name
    RETURNING id, title, organization_id, created_by
),
-- 7. Activity Logs for Project Creation
project_logs AS (
    INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
    SELECT 
        organization_id, 
        created_by, 
        'project_created', 
        'project', 
        id, 
        jsonb_build_object('name', name)
    FROM inserted_projects
),
-- 8. Activity Logs for Task Creation
task_logs AS (
    INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
    SELECT 
        organization_id, 
        created_by, 
        'task_created', 
        'task', 
        id, 
        jsonb_build_object('title', title)
    FROM inserted_tasks
)
SELECT 'Seeding completed successfully' AS status;
