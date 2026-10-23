# Start here — Saddle School

This is the new shared web + iPhone project. You do not need the earlier Swift-only starter.

## On your PC

1. Install Node.js 22.12 or newer (Node 24 LTS recommended).
2. Extract the ZIP.
3. Copy the **contents** of saddle-school-web into your local riding-app repository. package.json must be directly inside your repository folder. Keep your repository’s existing .git directory. If that repository already contains another app, use a separate branch or empty folder rather than overwriting it.
4. Open a terminal in that folder. Run these commands separately:

```bash
npm ci
npm run dev
```

5. Open the Local URL printed by Vite (normally http://localhost:5173).
6. Choose Add your first horse. Add a horse name and photo, then log a ride.

Stop the server with Ctrl+C. Restart later using npm run dev. Your saved records should remain in that same browser and origin.

## What is working

- Responsive desktop and phone layout.
- Horse profiles with uploaded JPG/PNG/WebP photos, breed, birth year, relationship, discipline, care notes and tack notes.
- Edit/archive/restore horses. Archiving retains ride history.
- Rider profile, experience and learning goal.
- Ride journal: date, duration, gait, exercises, notes, next practice focus, and self-reflection.
- Optional video attachment, local playback and guided self-review. Playback depends on browser support for the original video’s codec; MP4/H.264 is a practical choice for broad compatibility.
- Six starter guides with completion tracking. They are labeled as not yet instructor-reviewed.
- JSON backup/download and validated restore for records and horse photos.
- Generated Capacitor iOS project using the same web interface.

## What comes next

AI questions and AI video analysis are not connected. Accounts, cloud storage, cross-device sync, and reviewed teaching content are not implemented. No API key is required to run this version. Nothing has been deployed and your GitHub repository has not been modified remotely.

Data lives in IndexedDB in your current browser/app. A web browser and an installed iPhone app have separate stores. Even browsers on the same PC have separate stores. Use a downloaded backup to transfer records and photos manually until cloud sync is added. Clip files are excluded from backups; keep originals. Browser storage is not a guaranteed backup. Do not clear site data or uninstall without saving records you need.

The photo picker accepts JPG, PNG, WebP, not HEIC. Photos are resized to a maximum 1000 px edge before local storage. Video clips must be MP4, MOV, or WebM under 50 MB; clip duration is not automatically enforced. Prefer 15–30 second clips for self-review.

## iPhone browser

After hosting the production web build on HTTPS, open its URL in Safari. You can use Share > Add to Home Screen for quick access. This release does not include a service worker or offline website-install behavior.

To try the PC development server from an iPhone on the same Wi-Fi, use the Network URL printed by Vite. localhost on your iPhone refers to the phone, not your PC. Your firewall may need to allow the local development port on your private network. Do not expose the development server publicly.

## Native iPhone app (later, on a Mac)

The ios folder already exists. Do **not** run ios:add again.

With a Capacitor-compatible Xcode installation, run:

```bash
npm ci
npm run ios:sync
npm run ios:open
```

In Xcode, choose your signing team and a unique bundle identifier, select a simulator or connected iPhone, then Run. Before distributing, replace com.saddleschool.app with your chosen identifier consistently in capacitor.config.ts and the Xcode target, add app icons, test on actual devices, and complete Apple distribution requirements.

After each web-code change, run npm run ios:sync again to copy the latest build into iOS. iOS assets are bundled; the native app does not point at a PC development server. Xcode compilation/signing have not been tested in this Linux environment.

## Build and GitHub

```bash
npm test
npm run build
```

The production website is in dist/. A static host can use npm ci && npm run build as its build command and dist as its publish directory. This project uses no server routes; all current data is device-local.

After checking git status in your own repository, commit these source files using your usual Git workflow. Do not commit node_modules, personal backup JSON files, photos, or videos. The lockfile should be committed.
