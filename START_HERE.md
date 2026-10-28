# Native iPhone setup — v0.3.0

Read IPHONE_SETUP.md. On your Mac run npm ci, then npm run iphone. The existing riding cloud project is configured for this native build. Xcode signing and real-device testing remain required.

# Sign-in fix — v0.2.1

This version fixes production Supabase configuration. Vite must read direct import.meta.env.VITE_SUPABASE_* properties; an alias in v0.2 caused the production bundle to miss the configured Render values.

For an existing v0.2 repository, copy src/cloud.ts and src/vite-env.d.ts from this release into your repository, commit, push, and redeploy. Keep the existing Render VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY variables. The database setup is already installed in the Saddle School project; do not run setup.sql again.

The production-config regression test builds with fixture public values and checks that they are embedded in the generated bundle. Run npm run test:config after copying the full package.

# Saddle School — private cloud edition

This is the complete v0.2.1 project update. It adds private account sign-in, Supabase records and clip storage, save-conflict protection, retained document history, and an encrypted daily Google Drive backup workflow.

**Start with CLOUD_SETUP.md.** A separate Saddle School Supabase project and its public configuration are required. This package does not connect to or alter Rangebook.

1. Extract the ZIP and copy the contents of saddle-school-web into your PC repository, including `.github` and `.env.example`. Keep your existing `.git` directory.
2. Follow CLOUD_SETUP.md to create the riding project, run supabase/setup.sql, create your account/membership and configure Render.
3. For PC development: copy .env.example to .env and enter ONLY the riding URL/publishable key. Run `npm ci`, then `npm run dev`.
4. Push your source changes to GitHub; Render builds with `npm ci && npm run build`, publishing dist.
5. Configure and test external backups using CLOUD_SETUP.md. Backups are not active merely because the app is deployed.

The browser/iPhone clients share the same cloud account. Reload to fetch newer records from another device. No offline queue is included. Records cannot silently fall back to browser-only storage if configuration is missing.

The existing ios/ project uses the same web interface. On a Mac with compatible Xcode, set the same two public variables in .env, then run `npm ci`, `npm run ios:sync`, and `npm run ios:open`. Choose signing/bundle ID and test on devices. Do not run ios:add again.

Manual JSON downloads still exclude clips; scheduled encrypted owner backups include them. Original local records require an explicit import; see CLOUD_SETUP.md. AI remains unconnected.
