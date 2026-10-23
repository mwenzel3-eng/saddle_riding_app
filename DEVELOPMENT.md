# Development notes

## Scope and data model

This supersedes the earlier native-only scaffold with a shared React client. No singing-trainer files were copied or changed. No connection to the user's existing singing repository was required.

One local rider profile has multiple horses, ride logs and lesson completion IDs. Each horse has a stable generated ID; each ride links to a horse ID, so horse renames do not break history. Archive horses rather than deleting related history. Self-reflection selections are user-entered observations, never algorithmic skill ratings.

IndexedDB stores a versioned state object in `records` and original video Blobs in `videos`. Save operations update the state and media together in one transaction. On a storage failure, the React state remains at the previous saved value. This release has no encryption layer, authentication, online accounts, automatic backups, synchronization, or multi-tab conflict resolution. Avoid simultaneously editing the same store from multiple tabs; a later save can replace another tab's changes.

Photo data URLs are resized/encoded JPEGs and included in backups. JSON import validates schema/IDs/horse links, strips media references and copies only allowlisted properties. Restoring replaces the current state and clears existing clip storage in one transaction. The UI confirms this replacement first. Clips are intentionally excluded from JSON to keep backups manageable.

## Next build sequence

1. User-test horse records, photos, journal and local backups on the user's PC and iPhone Safari. Add browser tests for file handling and import/export. Validate generated native app in Xcode and test app lifecycle/storage on real iPhones.
2. Add sign-in and a backend with per-account ownership checks, private photo/video storage, authenticated URLs, database migrations, export/delete controls and tested backups. Scope and approve a provider before provisioning any paid service. Do not describe local records as synced.
3. Review learning content with qualified English-riding instructors. Add source/reviewer/version metadata and accessible illustrations. Replace the six starter guides with a reviewed curriculum as appropriate.
4. Add server-side LLM questions grounded in reviewed lessons. Explicitly show approved horse context; never put provider keys in VITE_ variables or native assets. Supply references and uncertainty. Clinical diagnosis/treatment is outside scope.
5. Add optional private short-clip upload and background review behind a feature flag. First scope: one rider/horse, fixed side view, walk/trot, full bodies visible; at most two timestamped posture observations, one visibility limitation and one reviewed practice focus. Sparse frames cannot support rhythm, exact angle, subtle contact or competence claims. Return unable-to-assess for unsuitable clips. Test against instructor-labeled footage before release.

The current local video field accepts other gaits because it is a general journal and self-review tool. A future AI endpoint must independently reject unsupported footage instead of treating journal labels as validated.

## Distribution

Node dependencies are pinned by package-lock.json. Capacitor 8 project uses Swift Package Manager. Native compilation is a separate step on a suitable Mac/Xcode environment; generated native sources do not equal a signed or App Store-ready application. Review app identifiers and app icons before distribution. Changing the native package identifier may change its local storage identity.

The stylesheet optionally loads Google Fonts; system/Georgia fallbacks remain usable when offline. No horse records/media are transmitted to a server in this release. Production static hosting should use HTTPS. No service worker is configured, so the website is not guaranteed to reload offline; native iOS bundles the built assets.
