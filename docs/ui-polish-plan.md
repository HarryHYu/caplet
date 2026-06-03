# UI Polish Sprint Guardrails

This plan keeps UI polish limited to presentation work and protects backend, API, database, and authentication behavior from accidental changes.

## Change boundaries

### Do not modify

UI polish work must not touch these areas:

- `backend/`
- `backend/routes/`
- `backend/models/`
- `backend/migrations/`
- `backend/config/`
- API response shapes
- database behavior
- authentication behavior

If a polish task appears to require any of the items above, stop and split that work into a separate non-polish task before continuing.

### Allowed files and folders

Polish changes are limited to:

- `src/`
- `public/`, only when adding or updating frontend assets
- `src/index.css`
- `tailwind.config.js`, only for frontend design tokens
- Frontend documentation, including this file

## Pre-merge verification checklist

Before merging UI polish work, confirm each item below:

- Existing frontend routes still render.
- Auth navigation links still work.
- API calls are untouched.
- Calculator tests still pass.
- No backend files were changed.

## Suggested verification commands

Run these checks from the repository root before opening or merging a polish pull request:

```bash
npm run build
npm run test -- src/test/calculators.test.js
git diff --name-only -- backend backend/routes backend/models backend/migrations backend/config
git diff -- src/services/api.js src/contexts/AuthContext.jsx src/components/LoginForm.jsx src/components/RegisterForm.jsx src/pages/Login.jsx src/pages/Register.jsx
```

Expected results:

- `npm run build` completes successfully, proving the routed frontend bundle compiles.
- Calculator tests pass.
- The backend diff command prints no files.
- The auth/API diff command prints no unintended authentication or API changes.
