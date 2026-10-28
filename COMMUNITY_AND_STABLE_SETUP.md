# Saddle Up: community, stables, trophies and purchases

The user-facing name is **Saddle Up**. Existing bundle ID (`com.saddleschool.app`), Supabase project (`zwnvoilwycnffkknpmkr`, named Saddle School in the dashboard), account IDs and private records stay intact. No Rangebook project is involved.

## What is implemented

- Email/password signup and automatic app membership. New users are not moderators.
- Optional community profiles: photo, display name, bio, interests and experience. Emails remain private.
- Rider search, connection requests, accepting/declining, disconnecting and blocking.
- Discussion posts and comments; reporting; an owner moderation queue to dismiss reports, hide content or suspend community access.
- Owned-horse stable pages: story, three free wallpapers, four free stickers, placement and saved layouts.
- Private show-class records: date, show, venue, horse, class, division, placing, score, ribbon, notes and photo; edit/delete supported.
- Derived ride, show and ribbon milestone badges. Multiple classes at the same named event/date/venue count as one show. Future-dated events do not earn badges. Results are self-reported.
- Explicit horse-page publishing. Published snapshots contain the horse photo, story, decor and trophy results, not care/tack notes, ride notes, videos or AI critiques. Republish to update a snapshot; “Make private” removes it from the community.
- Stripe web checkout and StoreKit 2 native purchasing/restoration with server verification and refund/revocation handling. Premium items stay unavailable until configured.

## Open the features

1. Sign in. **Community → My community profile** lets you choose a display name and photo, accept the guidelines, and make the profile visible to signed-in riders.
2. Use **Find riders**, **Connections**, and **Discussions** to participate. Open a rider's name to see their profile and published horses.
3. Under **My horses**, edit a horse and set **Your relationship → Owned**. Open its profile to find **My stable page** and **Trophy room & badges**.
4. Choose wallpaper, choose a sticker and tap the page to place it (or choose **Add to center**). Save the page. Up to 12 stickers are supported.
5. **Trophy room** in the main navigation covers all horses, including lesson and leased horses. Add one record per show class; use the same event name, date and venue across its classes.

## Public signup: owner configuration

Public email signup is enabled in the connected Supabase project, and email confirmation is required. That setting was checked through Supabase's public Auth settings endpoint. Actual delivery to a new outside user's address has not been tested.

Before inviting the general public:

1. In [Saddle School Auth](https://supabase.com/dashboard/project/zwnvoilwycnffkknpmkr/auth/providers), keep the Email provider and signup enabled, and keep email confirmation enabled.
2. Set the Auth **Site URL** to the deployed HTTPS web app. Confirmation links should lead to this site. After confirming in a browser, native users return to the app and sign in with their email/password.
3. Configure a custom SMTP provider and a verified sending address/domain. Supabase's default mail service restricts delivery to project-team addresses and has tight limits; it is not public production email delivery. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
4. Test signup with a new non-team email, confirm the email, sign in, save a horse and reload on another device.
5. Review community rules, publish the app's support contact and privacy/terms documents, and establish regular moderation. The prototype guidelines are not a substitute for those business policies.

The existing app owner was seeded as moderator before public membership began. **Community → Moderation** lists reports. Suspensions affect community content; users retain access to their own private riding records. No direct messages are included. Blocks hide community content in both directions; moderators can still inspect reported content. Private administrator tables cannot be edited by clients.

Owners can manage moderators or reverse a suspension through Supabase SQL, using a deliberately selected account UUID. Never derive moderator privileges from editable user metadata.

## Premium items: $0.99 USD each

The products below are one-time, non-consumable purchases:

| Item | Internal ID | Apple product ID | Stripe price secret |
| --- | --- | --- | --- |
| Heritage plaid wallpaper | `heritage` | `com.saddleschool.app.decor.heritage` | `STRIPE_PRICE_HERITAGE` |
| Golden crown sticker | `crown` | `com.saddleschool.app.decor.crown` | `STRIPE_PRICE_CROWN` |
| Show ring rider avatar | `avatar-dressage` | `com.saddleschool.app.avatar.dressage` | `STRIPE_PRICE_AVATAR_DRESSAGE` |
| Rosette rider avatar | `avatar-rosette` | `com.saddleschool.app.avatar.rosette` | `STRIPE_PRICE_AVATAR_ROSETTE` |
| Hunter rider avatar | `avatar-hunter` | `com.saddleschool.app.avatar.hunter` | `STRIPE_PRICE_AVATAR_HUNTER` |
| Show jumper avatar | `avatar-jumper` | `com.saddleschool.app.avatar.jumper` | `STRIPE_PRICE_AVATAR_JUMPER` |
| Dressage rider avatar | `avatar-classical-dressage` | `com.saddleschool.app.avatar.classicaldressage` | `STRIPE_PRICE_AVATAR_CLASSICAL_DRESSAGE` |
| Cross-country rider avatar | `avatar-cross-country` | `com.saddleschool.app.avatar.crosscountry` | `STRIPE_PRICE_AVATAR_CROSS_COUNTRY` |
| Saddle seat rider avatar | `avatar-saddle-seat` | `com.saddleschool.app.avatar.saddleseat` | `STRIPE_PRICE_AVATAR_SADDLE_SEAT` |
| Western pleasure rider avatar | `avatar-western-pleasure` | `com.saddleschool.app.avatar.westernpleasure` | `STRIPE_PRICE_AVATAR_WESTERN_PLEASURE` |
| Reining rider avatar | `avatar-reining` | `com.saddleschool.app.avatar.reining` | `STRIPE_PRICE_AVATAR_REINING` |
| Barrel rider avatar | `avatar-barrel` | `com.saddleschool.app.avatar.barrel` | `STRIPE_PRICE_AVATAR_BARREL` |
| Western trail rider avatar | `avatar-western-trail` | `com.saddleschool.app.avatar.westerntrail` | `STRIPE_PRICE_AVATAR_WESTERN_TRAIL` |
| Arabian English pleasure avatar | `avatar-arabian-english` | `com.saddleschool.app.avatar.arabianenglish` | `STRIPE_PRICE_AVATAR_ARABIAN_ENGLISH` |
| Arabian hunter pleasure avatar | `avatar-arabian-hunter` | `com.saddleschool.app.avatar.arabianhunter` | `STRIPE_PRICE_AVATAR_ARABIAN_HUNTER` |
| Arabian native costume avatar | `avatar-arabian-native` | `com.saddleschool.app.avatar.arabiannative` | `STRIPE_PRICE_AVATAR_ARABIAN_NATIVE` |
| Rose heart horse charm | `charm-heart` | `com.saddleschool.app.charm.heart` | `STRIPE_PRICE_CHARM_HEART` |
| Moonlight horse charm | `charm-moon` | `com.saddleschool.app.charm.moon` | `STRIPE_PRICE_CHARM_MOON` |
| Lucky horseshoe charm | `charm-horseshoe` | `com.saddleschool.app.charm.horseshoe` | `STRIPE_PRICE_CHARM_HORSESHOE` |

US base price: **$0.99 each**, as requested. Apple may localize storefront pricing; the app shows the storefront's actual display price. The web backend requires a one-time USD Stripe Price of 99 cents. Users buy the decoration for their rider account and can apply it to multiple horses. No merchant products, charges or secret credentials were created by this implementation.

### Stripe website checkout

The Stripe plugin is available but was not connected during implementation. Connect it to allow account-assisted configuration, or use the Stripe dashboard directly.

1. In Stripe **test mode**, create the products above, each with a **one-time USD $0.99 Price**. Copy each `price_...` ID.
2. In [Supabase Edge Function secrets](https://supabase.com/dashboard/project/zwnvoilwycnffkknpmkr/functions/secrets), add:

   | Secret | Value |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | Server-side Stripe secret key for the matching test/live mode |
   | `STRIPE_PRICE_HERITAGE` | Heritage `price_...` ID |
   | `STRIPE_PRICE_CROWN` | Crown `price_...` ID |
   | `STORE_RETURN_URL` | Your deployed web app's HTTPS URL, with no secret in the URL |

3. In Stripe **Developers / Workbench → Webhooks**, add this endpoint:

   `https://zwnvoilwycnffkknpmkr.supabase.co/functions/v1/decor-webhooks`

4. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`. Copy that endpoint's signing secret into the Supabase secret `STRIPE_WEBHOOK_SECRET`.
5. Refresh the stable boutique in the website. It should show the real $0.99 price. Buy with a Stripe test card, return to the website, and reopen the owned horse's stable page. Server-verified fulfillment unlocks the item; returning to a success URL alone never does.
6. Test a complete refund, duplicate event delivery and reopening the same checkout reference. A refunded receipt must not unlock the item again.
7. When ready, create matching **live-mode** products/Prices and a live webhook endpoint, then replace the Stripe secrets/price IDs together. Test/live values must not be mixed. Charges should remain in test mode until explicitly enabled by the owner.

Full refunds revoke purchases through signed Stripe events. Partial refunds do not revoke a decoration. Disputes require owner review in this version. Paid purchases are tied to the signed-in rider account, not merely the browser or cardholder email.

### Apple iPhone purchases

1. In App Store Connect, select the existing app with bundle ID **`com.saddleschool.app`**. Its display name can be Saddle Up; do not create a new bundle ID for the rename.
2. Complete the Paid Apps agreement, tax and banking setup if outstanding.
3. Create the product IDs from the table as **Non-Consumable** in-app purchases. Set the US base price to **$0.99**, add required localization/review information and availability, and submit them through Apple's normal review process when ready.
4. Find the app's numeric **Apple ID** in App Store Connect → App Information. Save that number in Supabase Edge Function secrets as `APPLE_APP_ID`. This is not your Apple login ID.
5. Set the **App Store Server Notifications V2** URL (production and sandbox) to:

   `https://zwnvoilwycnffkknpmkr.supabase.co/functions/v1/decor-webhooks`

6. For sandbox/TestFlight testing only, set the server secret `APPLE_ALLOW_SANDBOX=true`. Remove it or set it to `false` for production-only receipt acceptance. Sandbox receipts are not real payments; never leave sandbox unlocking enabled unintentionally in a public production project.
7. Run `npm run iphone`, select your signing team and device in Xcode, and test with an App Store sandbox account or TestFlight. The In-App Purchase capability and local StoreKit bridge are included in the project.
8. Test purchase, cancel, approval-pending, app restart and **Restore purchases**. Restore on the same Saddle Up account: the signed Apple `appAccountToken` must match that account. Transactions are finished only after server confirmation.
9. Test Apple refund/revocation notifications. The server verifies Apple's certificate chain, bundle ID, environment and app ID before granting access; a client claim alone cannot unlock decor.

No Stripe checkout links are used inside the native iPhone shop. The implementation uses Apple in-app purchasing there. See [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Apple's server verification library](https://github.com/apple/app-store-server-library-node). Store/App Store account configuration, sandbox transactions and live payments remain owner setup/testing steps.

## Deployment and backups

Applied to the dedicated Saddle School database:

- `20261028210856_saddle_up_community_stables_trophies_store`
- `20261028213324_saddle_up_full_feature_backups`
- `20261028221528_rider_pictures_avatars_horse_charms`
- `20261028223433_english_western_arabian_avatar_wardrobe`

Deployed Edge Functions: `decor-store` (authenticated users) and `decor-webhooks` (signed Stripe/Apple events). The webhook function has platform JWT checks disabled because payment providers do not send Supabase JWTs; its handlers verify provider signatures. Do not disable signature verification.

Commit/push and deploy the updated website using the existing hosting workflow. `npm run ios:sync` has prepared the native project; build/run in Xcode to install it. A simulator build was verified. No App Store submission or hosted web deployment was performed.

The updated encrypted owner backup includes critiques, profiles, connections, blocks, discussions, reports, shows, decor, entitlements, published pages, the private receipt/moderator/quota state and SQL migrations. Deploy the updated backup script and keep the external schedule configured. The owner recovery script still handles the original riding document/media drill; restoring the additional feature tables requires a deliberate migration/data restore in foreign-key order. Manual ride JSON exports still contain only the original riding document and photos, not these separate feature tables or clips.

For an App Store public release, complete support/contact and privacy disclosures, terms, moderation operations and account deletion. In-app account deletion and self-service password recovery are not implemented in this iteration. New production signup emails, community interaction between real devices, and real payment purchases still need end-to-end testing after merchant/email configuration.

## Rider pictures, avatar wardrobe and horse charms

Under **Profile**, upload a JPG/PNG/WebP rider photo or choose from a wardrobe of 20 illustrated avatars (6 free and 14 premium), filtered into Everyday, English, Western and Arabian collections. Click **Save rider picture** to persist the choice across devices. It appears in the app's top-bar profile button. Uploads are processed to a maximum 1000-pixel dimension, with a 1.5-million-character stored image limit. These pictures are private account data.

Under **Community → My community profile**, the same picker chooses a separate community picture. **Use my private rider picture for this community profile** copies the current private choice into the draft. Saving a visible community profile deliberately shares that copied picture. Later edits to the private photo do not automatically publish anything. Existing uploaded community photos are preserved by the migration.

Under an owned horse's **My stable page**, the boutique includes Rose heart, Moonlight and Lucky horseshoe charms. Each is a one-time $0.99 USD base purchase, usable on multiple horses. Equip up to three distinct owned charms; they hang from the portrait frame. Click **Save my stable**, and republish if the new charms should appear on an already-shared community page. Charms are separate from placeable stickers.

Create the five added avatar/charm products in Stripe and App Store Connect using the table above, and add their Stripe Price IDs to the matching Supabase secrets. Existing products and keys remain valid. No new products or prices were created in your merchant accounts automatically; new paid items remain unavailable until configured. Rebuild the native app to include its expanded StoreKit product list and bundled avatar illustrations.

Server-side validation prevents selecting an unowned premium avatar or charm, even through direct API calls. Verified refunds reset the affected selected avatar and remove the affected charm from private and published horse pages. Other owned items remain equipped. The encrypted owner backup now includes `saddle_rider_pictures`; manual ride JSON exports do not include private rider pictures or the separate community profile.

## Expanded discipline wardrobe

The wardrobe adds 15 portraits: six English (hunter, jumper, dressage, cross-country, saddle seat and schooling), five Western (ranch, pleasure, reining, barrel and trail), and four Arabian (country pleasure, English pleasure, hunter pleasure and Mounted Native Costume). Schooling, ranch and Arabian country pleasure are the three new free choices. The other 12 are $0.99 USD base non-consumable purchases; create their merchant products using the table above before enabling sales.

The outfit designs are style illustrations, not a guarantee that an outfit satisfies a particular competition's current rules. See [research and design notes](docs/AVATAR_ATTIRE_RESEARCH.md) and [the complete visual preview](docs/avatar-wardrobe-preview.html). Rebuild SVG assets and wardrobe metadata with `node scripts/build-rider-avatars.mjs`; the original five portraits are preserved. Current selections and previously purchased avatars retain their existing IDs.
