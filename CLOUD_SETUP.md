# Private cloud storage and backups — setup

This release changes Saddle School from browser-only records to invite-only cloud accounts. Render still hosts a static website; Supabase owns authentication, records and private media. GitHub Actions can make encrypted daily copies to private Google Drive. Nothing is scheduled or activated until you configure the services below.

## 1. Create a separate Supabase project

Use a NEW project named Saddle School. Keep both Gabe's Rangebook and Rangebook Recovery Test unchanged. Do not put riding records into either project. If your organization has no remaining project capacity, resolve that in Supabase before continuing; do not delete a Rangebook project to free a slot.

From the new project's settings, retain the project URL and **publishable** key. These are public app configuration. The **secret/service-role** key is different and must NEVER go into Render VITE_ variables, app source, screenshots or chat. It is used only by the owner-managed backup workflow.

In the new project's SQL Editor, run the complete `supabase/setup.sql` ONCE. It creates membership/document/history tables, row policies, a guarded save RPC, and a private immutable media bucket. It contains no destructive drops. A repeated run will report existing objects; do not delete existing data to make it rerun.

In Authentication settings, disable public signups and anonymous sign-ins. Use Supabase's user administration to create your first email/password account with confirmed email. No app password was created for you. Choose the password privately in the dashboard. The current app uses password sign-in only; email-invite links/password-reset links are not implemented in the client.

Copy that account's UUID from the user administration page and run this SQL, substituting that UUID:

```sql
insert into public.saddle_members(user_id)
values ('YOUR-ACCOUNT-UUID')
on conflict do nothing;
```

For every additional invited rider: create their Auth user, then add their UUID to saddle_members. App accounts are separate from Supabase dashboard accounts. Membership is required even if someone manages to create an Auth account. Removing membership blocks records/media access without deleting retained data. Owners administer memberships in Supabase, not through a public app screen.

## 2. Update your PC repository and Render

Replace the earlier app source with this ZIP's contents. Include the hidden `.github` directory. Keep your existing `.git` directory and do not commit local credentials. This is a complete project update, not a patch script.

In Render's static-site Environment settings add:

| Variable | Value |
| --- | --- |
| VITE_SUPABASE_URL | New riding project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | New riding project's publishable key |

Keep the build command `npm ci && npm run build`, publish directory `dist`, and Root Directory pointing at the directory containing package.json. Push the update, then redeploy. Vite embeds these public configuration values at build time, so changing them requires a rebuild.

For PC development, copy `.env.example` to `.env`, enter the same two values, run `npm ci` then `npm run dev`. Do not put any privileged key into `.env` with a VITE_ prefix.

If configuration is missing, the app shows a setup message and refuses to fall back to an unprotected local app. Once configured, sign in with your app account. New profiles/photos/ride logs save to its private cloud document. Clips upload to the private saddle-media bucket. Reload on another device to fetch latest records; changes are not pushed live to an already-open tab.

An older tab's stale version cannot overwrite a newer save. On a conflict, copy unsaved notes, reload and retry. This version does not queue offline writes. Internet access is required to load/save. A failed or uncertain request must not be treated as a confirmed save.

## 3. Move earlier local records

Existing browser-only records are not silently assigned to the first account that signs in.

On the SAME browser and site origin where you entered them, sign into your correct account, open Profile > Import earlier local records, and review the confirmation. This imports records and horse photos; local clips remain untouched in the earlier local database, so reattach the original files if wanted.

If your earlier records are at localhost, that browser store is separate from Render. Download the JSON backup from the old app before replacing it; then use Profile > Restore backup after signing into the cloud app. JSON backups exclude video files. Import/restore creates a new document save; previous cloud versions remain retained.

## 4. Configure external daily backups

Only the owner configures this. Other riders do nothing. Backups include ALL invited riders' documents, horse photos embedded in them, retained versions, membership/account-ID/email mappings, the setup SQL and every clip in the riding bucket, including retained older files. Credentials, password hashes, sessions and auth tokens are not included. A complete service rebuild requires recreating Auth users and settings; this is a logical application backup, not a full PostgreSQL/PITR dump.

The script encrypts the archive with AES-256-GCM and a passphrase-derived key before upload. The package and each captured file have checksums. Keep the passphrase in your password manager as well as the workflow secret: a lost passphrase means the encrypted backups cannot be recovered.

### Google Drive connection

Install rclone from its official distribution on your own PC. Follow https://rclone.org/drive/ to create your own Google OAuth client where required. Run `rclone config` and create a Google Drive remote named EXACTLY `saddle-drive`. Authorize your private Google Drive in your own browser. Use a dedicated config file containing only this remote; do not include Rangebook or unrelated remotes. Keep the resulting config secret.

Use a dedicated private backup folder; the workflow writes to `Saddle-School-Backups` on that remote. No public link or sharing grant is needed. You can scope the remote to a dedicated folder using its root_folder_id option if desired. Do not commit the rclone config or paste it in chat.

### GitHub secrets

In the riding repository's Settings > Secrets and variables > Actions, create:

| Secret | Value |
| --- | --- |
| SADDLE_SUPABASE_URL | Riding project's URL |
| SADDLE_SUPABASE_SECRET_KEY | Riding project's server-only secret or legacy service-role key |
| SADDLE_BACKUP_PASSPHRASE | Long unique passphrase, at least 20 characters; keep an independent recovery copy |
| SADDLE_RCLONE_CONFIG | Complete dedicated rclone config for the saddle-drive remote |

Keep the repository private and restrict who can change workflows, because backup credentials can read all riding accounts. These secrets belong in GitHub Actions, not Render frontend variables. Do not reuse Rangebook backup credentials.

Commit `.github/workflows/private-backup.yml` on the default branch. In GitHub Actions open Private daily backup > Run workflow. Confirm both the encrypted `.ssbackup` file and its `.sha256` sidecar appear in your private Google Drive folder and the transfer verification step passes. GitHub's own workflow failure notifications are the initial alert channel; check the last successful run regularly. A green compile is not proof of a successful backup.

The workflow is set for 10:00 UTC, approximately **3 a.m. Arizona time**, daily. GitHub scheduling is best effort and may run late. It copies unique timestamped files; it never sync-deletes or automatically prunes old backups. Storage/Actions usage may grow. Do not enable usage that incurs charges without reviewing your provider plan.

Snapshots are captured logically while users may be active, not as one global database transaction. Media is immutable and retained; the backup detects missing referenced media and fails instead of publishing an incomplete copy. Database rows across accounts may reflect slightly different capture times. For a strict coordinated recovery point, use a maintenance window and an appropriate database backup method.

## 5. Safe restore drill before relying on backups

1. Download a recent `.ssbackup` and its `.sha256` sidecar. Verify the encrypted archive checksum with your platform's SHA-256 utility.
2. Set BACKUP_PASSPHRASE privately in your terminal environment. Do not type it into a command that will be saved in shell history.
3. Run `node scripts/unpack-backup.mjs PATH-TO-FILE.ssbackup NEW-EMPTY-OUTPUT-DIRECTORY`. It refuses an existing destination, authenticates the encrypted file, and checks all captured file hashes. Decrypted output contains private data: store it securely and keep it outside Git.
4. Create a NEW riding recovery-test project, run the setup SQL there, and create an empty confirmed test Auth user. Do not use either existing Rangebook project. Do not add this test account to saddle_members yet; the recovery tool does that.
5. Privately set RECOVERY_SUPABASE_URL, RECOVERY_SUPABASE_SECRET_KEY, RECOVERY_USER_ID, and EXPECTED_RECOVERY_PROJECT_REF in your terminal environment. Use an account from records/accounts.json as SOURCE_USER_UUID.
6. First run `node scripts/recover-account.mjs VERIFIED-DIRECTORY SOURCE_USER_UUID`. This is a local dry run with no remote write.
7. For the isolated drill, run the same command with `--apply`. The script refuses the original source project, either Rangebook project, an unexpected target ref, or a nonempty target account. It inserts; it cannot overwrite existing target data. A failed partial drill needs a NEW empty test account before retrying.
8. Point a local test build at the riding recovery project. Sign in and check horse photos, records, clip playback and a new save. Create a second invited test account and verify neither account can read the other's records/media. Only after this drill passes should you rely on the recovery process.

In production, recovering an old snapshot can lose changes made after that snapshot. Preserve current data, identify exactly what was lost, recover to an isolated project first, and plan a selective reconciliation. Never reset an active project or run a whole-project overwrite as an experiment. Self-service history restore in Profile creates a NEW save and retains the prior current version; it still changes that rider's current records across devices.

## Retention and privacy

Document history and removed/replaced clips are retained indefinitely in this initial version. Removing a ride or clip link does not permanently erase retained files/history/backups. There is no automatic retention deletion. Ask the owner for a coordinated permanent deletion process if needed. Project administrators and the backup operator can access all riders' records; account separation protects riders from each other, not from administrators.

## Verification status

The build, isolated Postgres schema/RLS tests, stale-save tests, and mocked backup/encryption/decryption tests run locally. The setup has NOT been deployed into a live riding Supabase project, live sign-in/media access and Drive transfer have NOT been tested, and the daily schedule is NOT active until the required secrets/workflow are installed. Xcode/device testing is still required for native iOS.
