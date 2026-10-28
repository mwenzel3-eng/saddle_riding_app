# Saddle School on your iPhone

This is the native Capacitor app project using the same React interface and Supabase account as the website. It bundles the interface inside the app, rather than opening the Render website. Horses, photos, records and clips use your existing private riding account. Sign in separately on each device. Internet is required to load/save.

## On your Mac

Requirements: Node 22.12+ (Node 24 recommended), Xcode 26+, and your Apple account added to Xcode.

1. Extract this ZIP. Use the folder containing package.json as your project folder. If copying into your Git repository, include ios/, config/, scripts/ and the updated package/lock files. Preserve any existing signing changes you made in your local Xcode project.
2. Open Terminal in that folder and run:

```bash
npm ci
npm run iphone
```

The command builds the web interface, verifies the public cloud configuration was embedded, syncs native plugins/assets, and opens Xcode. The riding project's public URL and publishable key are already in config/public-cloud.json. These are public client settings, not server secrets. Existing environment values can override them. Render environment variables are separate and still apply to Render's build.

3. In Xcode select the blue App project, then the App target > Signing & Capabilities. Choose your Team and keep Automatically manage signing enabled. If com.saddleschool.app is unavailable, change the bundle identifier to your own unique value in both Xcode and capacitor.config.ts.
4. Choose an iPhone simulator and press Run first.
5. To install on your iPhone, connect it to the Mac, approve Trust and Developer Mode on your own device if requested, select it as the destination, and press Run.
6. Open Saddle School on your phone and sign in with your existing riding-app email/password.

The project contains an app icon, camera/photo/microphone usage descriptions for optional attachments, and a required-reason privacy manifest for the file plugin. Backup export opens the native share sheet; choose Save to Files. Export still includes records/photos, not clip files. Video/photo picking and playback need real-device testing.

If you only want to prepare files on another computer, run npm run ios:sync. Opening, signing and compiling the native app need Xcode on a Mac. To reopen without rebuilding, use npm run ios:open.

## Changes and website updates

After editing web source, run npm run iphone again. Native app updates require another sync/build/install; deploying to Render does not update the interface already bundled in the installed app. Both clients still read/write the same private cloud records. No new Supabase project or schema setup is needed.

## Check on the phone

- Sign in, add/edit a test horse, then reload the website and confirm the same record appears there.
- Test photo selection, a short clip upload/playback, sign out, sign back in, and JSON backup > Save to Files.
- Confirm sign-out hides records, and a different test account cannot access them.
- Test portrait/landscape, keyboard scrolling and bottom navigation around the device safe area.

## Distribution and limits

This is a source project prepared for Xcode, not a signed .ipa or an App Store submission. The web build and native asset/plugin sync are checked here; this Linux workspace cannot compile or install the app. TestFlight/App Store distribution requires the appropriate Apple Developer setup, app privacy details, screenshots and Apple's review. Review the privacy manifest and privacy disclosures for the actual features you ship. Password reset/invitation links, AI coaching, offline saves and automatic backup activation are still pending.

Official guides:
https://capacitorjs.com/docs/ios
https://capacitorjs.com/docs/ios/configuration
https://capacitorjs.com/docs/apis/share
