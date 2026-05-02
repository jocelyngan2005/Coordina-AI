# Coordina AI Frontend (Standalone Mockup)

This frontend now runs in a fully standalone mock mode.

All data operations are handled inside the app through local mock services in:

- `src/api/mockStore.ts`

No backend process is required for creating projects, running ingestion, opening workspaces, or loading analytics.

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.

## What Changed

- API modules in `src/api/` now call local mock methods instead of `fetch`.
- Workflow pipeline calls are simulated in-memory.
- Project, team, task, document, workflow, and analytics data are all provided by the frontend mock store.
- UI pages no longer depend on backend-availability fallbacks.

## Notes

- Data is in-memory per browser session and resets on full refresh.
- The seeded demo project remains available as the initial dataset.
