# Testing Guide

This project does not have an automated test suite yet. Before pushing to GitHub, use this guide to run a full manual verification pass across the frontend, backend, database, APIs, and the main user journey.

This guide is written for Windows PowerShell because that matches the current local setup.

## What To Verify Before Push

- Frontend lint passes
- Frontend production build passes
- Backend starts cleanly
- PostgreSQL is connected and schema is loaded
- Auth flow works: signup, login, refresh, logout
- Org, workspace, project, and task APIs work
- Main frontend routes load correctly
- A user can complete the core product flow end to end

## Project Scripts

Root:

```powershell
npm run dev
npm run lint
npm run build
npm run preview
```

Backend:

```powershell
cd backend
npm run dev
npm start
```

## 1. Preflight

From the project root:

```powershell
npm install
cd backend
npm install
cd ..
```

Create env files if needed:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

Frontend env should point to the backend API:

```env
VITE_API_URL=http://localhost:5000/api
```

Backend env must include:

- `PORT`
- `NODE_ENV`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL`

## 2. Static Checks

Run these first from the project root:

```powershell
npm run lint
npm run build
```

Rules:

- If `npm run lint` fails, stop and fix it before push.
- If `npm run build` fails, stop and fix it before push.
- Do not treat local dev success as enough. A clean production build is required.

## 3. Database Setup And Validation

Create the database if it does not exist yet:

```powershell
psql -U postgres -c "CREATE DATABASE project_manager;"
```

Load schema:

```powershell
psql -U postgres -d project_manager -f backend\db\schema.sql
```

Optional seed:

```powershell
psql -U postgres -d project_manager -f backend\db\seed.sql
```

Quick validation:

```powershell
psql -U postgres -d project_manager -c "\dt"
psql -U postgres -d project_manager -c "select count(*) from users;"
psql -U postgres -d project_manager -c "select count(*) from organizations;"
psql -U postgres -d project_manager -c "select count(*) from workspaces;"
psql -U postgres -d project_manager -c "select count(*) from projects;"
psql -U postgres -d project_manager -c "select count(*) from tasks;"
```

What good looks like:

- Tables exist
- No schema errors during load
- Backend health check returns success once the server starts

## 4. Start Backend And Frontend

Terminal 1:

```powershell
cd backend
npm run dev
```

Expected:

- Server starts on `http://localhost:5000`
- No env validation failures
- No PostgreSQL connection failures

Terminal 2:

```powershell
cd "c:\Users\kshit\OneDrive\Desktop\project manager"
npm run dev
```

Expected:

- Frontend starts on `http://localhost:5173`
- Browser loads without a blank page or startup crash

## 5. Backend Health And Route Smoke Tests

Set the base URL in PowerShell:

```powershell
$api = "http://localhost:5000/api"
```

Health check:

```powershell
Invoke-RestMethod "$api/health"
```

Expected:

- `success` is `true`
- `data.status` is `healthy`

Root check:

```powershell
Invoke-RestMethod "http://localhost:5000/"
```

Expected:

- API responds
- No 500 error

404 check:

```powershell
Invoke-RestMethod "$api/does-not-exist"
```

Expected:

- Returns a `NOT_FOUND` style error

## 6. Auth API Walkthrough

Signup:

```powershell
$email = "testuser$(Get-Random)@example.com"

$signup = Invoke-RestMethod -Method Post "$api/auth/signup" `
  -ContentType "application/json" `
  -Body (@{
    name = "Test User"
    email = $email
    password = "Password123"
    orgName = "Test Org"
  } | ConvertTo-Json)
```

Capture values:

```powershell
$access = $signup.data.accessToken
$refresh = $signup.data.refreshToken
$orgId = $signup.data.organization.id
$headers = @{ Authorization = "Bearer $access" }
```

Fetch current user:

```powershell
Invoke-RestMethod "$api/auth/me" -Headers $headers
```

Refresh token:

```powershell
$refreshResp = Invoke-RestMethod -Method Post "$api/auth/refresh" `
  -ContentType "application/json" `
  -Body (@{ refreshToken = $refresh } | ConvertTo-Json)
```

Login:

```powershell
$login = Invoke-RestMethod -Method Post "$api/auth/login" `
  -ContentType "application/json" `
  -Body (@{
    email = $email
    password = "Password123"
  } | ConvertTo-Json)
```

Logout:

```powershell
Invoke-RestMethod -Method Post "$api/auth/logout" `
  -ContentType "application/json" `
  -Body (@{ refreshToken = $refresh } | ConvertTo-Json)
```

Auth checks:

- Signup creates a user and organization
- Login returns access and refresh tokens
- `GET /auth/me` works with bearer token
- Refresh returns a new access token
- Logout revokes the refresh token

## 7. Organization And Workspace API Walkthrough

Get members:

```powershell
Invoke-RestMethod "$api/orgs/$orgId/members" -Headers $headers
```

Get workspaces:

```powershell
Invoke-RestMethod "$api/orgs/$orgId/workspaces" -Headers $headers
```

If signup does not create a workspace automatically, create one manually:

```powershell
$workspace = Invoke-RestMethod -Method Post "$api/orgs/$orgId/workspaces" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body (@{
    name = "Main Workspace"
  } | ConvertTo-Json)

$wsId = $workspace.data.id
```

Workspace checks:

- Members endpoint returns the signed-up user
- Workspaces endpoint returns data without auth errors
- Creating a workspace succeeds for an allowed role

## 8. Project API Walkthrough

Create project:

```powershell
$project = Invoke-RestMethod -Method Post "$api/workspaces/$wsId/projects" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body (@{
    name = "Launch Project"
    description = "Smoke test project"
  } | ConvertTo-Json)

$projectId = $project.data.id
```

Get projects in workspace:

```powershell
Invoke-RestMethod "$api/workspaces/$wsId/projects" -Headers $headers
```

Get project by id:

```powershell
Invoke-RestMethod "$api/projects/$projectId" -Headers $headers
```

Update project:

```powershell
Invoke-RestMethod -Method Patch "$api/projects/$projectId" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body (@{
    status = "active"
    description = "Updated during smoke test"
  } | ConvertTo-Json)
```

Project checks:

- Project appears in workspace listing
- Project detail loads
- Update persists

## 9. Task API Walkthrough

Create task:

```powershell
$task = Invoke-RestMethod -Method Post "$api/projects/$projectId/tasks" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body (@{
    title = "First task"
    priority = "medium"
  } | ConvertTo-Json)

$taskId = $task.data.id
```

Get tasks:

```powershell
Invoke-RestMethod "$api/projects/$projectId/tasks" -Headers $headers
```

Get task by id:

```powershell
Invoke-RestMethod "$api/tasks/$taskId" -Headers $headers
```

Update task:

```powershell
Invoke-RestMethod -Method Patch "$api/tasks/$taskId" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body (@{
    title = "First task updated"
    priority = "high"
  } | ConvertTo-Json)
```

Move task:

```powershell
Invoke-RestMethod -Method Patch "$api/tasks/$taskId/move" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body (@{
    status = "in_progress"
    position = 0
  } | ConvertTo-Json)
```

Task checks:

- Task is created successfully
- Task appears under the project
- Task update persists
- Task move updates `status` and `position`

## 10. Verify Data In PostgreSQL

After running the API flow, inspect records directly:

```powershell
psql -U postgres -d project_manager -c "select id,name,email from users;"
psql -U postgres -d project_manager -c "select id,name,slug from organizations;"
psql -U postgres -d project_manager -c "select id,name,organization_id from workspaces;"
psql -U postgres -d project_manager -c "select id,name,workspace_id,status from projects;"
psql -U postgres -d project_manager -c "select id,title,project_id,status,position from tasks order by status, position;"
```

You are checking that:

- API writes actually hit the database
- Foreign keys look correct
- Task status and order persisted correctly

## 11. Frontend Route And UI Smoke Test

Open the browser at `http://localhost:5173` and walk through:

Public routes:

- `/login`
- `/signup`

Protected routes:

- `/dashboard`
- `/project/:id`
- `/workspace/:id`

What to verify:

- Logged-out access to protected routes redirects to `/login`
- Signup navigates into the app
- Login works with the created user
- Sidebar loads workspaces and projects
- Opening a project route loads the board view
- Refreshing the page does not break auth unexpectedly
- Error states are readable if an API request fails

## 12. Frontend Auth And Refresh Behavior

The frontend attaches bearer tokens and attempts refresh automatically. Test that in the browser.

1. Sign in normally.
2. Open DevTools.
3. In the console, replace the access token with junk:

```js
localStorage.setItem('accessToken', 'bad-token')
```

4. Refresh the page.

Expected:

- The app should attempt refresh if a valid refresh token still exists
- If refresh succeeds, the user stays in the app
- If refresh fails, the user should be sent back to `/login`

## 13. Full Product Smoke Test

Run this as one uninterrupted user journey:

1. Signup
2. Confirm organization exists
3. Create a workspace if the app does not already provide one
4. Create a project
5. Open the project page
6. Create at least 2 tasks
7. Move one task to `in_progress`
8. Move one task to `done`
9. Refresh the page
10. Confirm tasks still appear in the expected columns
11. Logout
12. Login again
13. Confirm the same data still appears

If this flow passes, the product is in decent shape for a first public push.

## 14. Failure Signals That Should Block A Push

- `npm run lint` fails
- `npm run build` fails
- Backend cannot boot from a clean terminal
- `/api/health` fails
- Signup or login fails
- Workspace creation is impossible in both UI and API
- Project creation fails
- Task creation fails
- Drag and drop looks successful but does not persist after refresh
- Protected routes expose content while logged out
- Required env variables are missing

## 15. Nice-To-Have Additions Later

Once the core flow is stable, the next testing upgrades should be:

- Add backend route tests
- Add frontend component and route tests
- Add Playwright or Cypress end-to-end smoke tests
- Add a CI workflow that runs lint and build before merge

## Pre-Push Checklist

- `npm run lint`
- `npm run build`
- Backend starts cleanly
- Frontend starts cleanly
- `/api/health` returns success
- Auth flow works
- Workspace, project, and task APIs work
- Core browser flow works end to end
- No secrets are committed in `.env`

