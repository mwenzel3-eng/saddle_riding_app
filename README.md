# Saddle School — private cloud edition v0.2

Shared React/TypeScript/Vite interface for the web and Capacitor iOS, with Supabase Auth, private per-account documents, private clip storage, optimistic save conflicts, retained versions, and an encrypted Google Drive backup workflow.

**Read [START_HERE.md](START_HERE.md), then [CLOUD_SETUP.md](CLOUD_SETUP.md).** The project is not live-configured. A new, dedicated Supabase project is required; neither Rangebook project was changed.

## Commands

- npm ci — install locked dependencies
- npm run dev — development server, requires public Supabase values in .env
- npm run build — type-check and produce dist/
- npm test — backup-schema, Postgres authorization/conflict, and mocked encrypted-backup round-trip tests
- npm run ios:sync — build/copy web assets into existing native project
- npm run ios:open — open Xcode (Mac)
- npm run backup — server-only full application backup; requires privileged environment variables

## Files

src/Auth.tsx handles invite-only password sign-in. src/cloud.ts loads/saves private records and media. src/storage.ts retains legacy local reads for explicit migration only. supabase/setup.sql creates the dedicated-project schema and policies. scripts/backup.mjs, unpack-backup.mjs and recover-account.mjs handle encrypted backups, verification and a guarded isolated recovery drill. .github/workflows/private-backup.yml schedules copies at approximately 3 a.m. Arizona once configured.

AI answers and automated video critique remain pending. Guides are starter material awaiting instructor review. Administrator-managed credential recovery is required; the app does not yet implement email reset/invite link handling. Media and document history are retained indefinitely without automatic pruning.

No cloud project, account, provider billing, backup schedule or live Render setting was created by this package. Live end-to-end deployment, private-media access, Drive transfer and native iOS compilation remain to be verified after setup.
