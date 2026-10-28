# Video critiques

For step-by-step key creation, Supabase secret updates, expiration, and key replacement, see [OPENAI_KEY_SETUP.md](OPENAI_KEY_SETUP.md).

Open AI coach to upload an MP4, MOV or WebM clip (up to 50 MB and 60 seconds), or select a saved ride clip. Enter a feedback question, agree to sending frames to OpenAI, and click **Critique my video**. Twelve timestamped JPEG frames are sent; audio and the original video are not sent to OpenAI. Feedback is temporary on the page; copy useful notes into your ride journal.

## Server setup

The function source is in `supabase/functions/video-critique`. Deploy it to the **Saddle School** project `zwnvoilwycnffkknpmkr`. It validates the user's JWT and checks invited membership with that user's RLS policies. Its quota check uses the server-only Supabase service-role key, automatically supplied by Supabase. This key never reaches the browser. Do not deploy it to Rangebook.

In the Saddle School Supabase dashboard, open **Edge Functions → Secrets**, and add `OPENAI_API_KEY` using a key from an OpenAI API project with API billing enabled. Do not put this key in Vite variables, source control, or the browser. Optionally set `OPENAI_MODEL` to another image-capable Responses API model. The default is `gpt-4.1-mini`.

Deploy the web app with the normal build/deploy process, then sign in and request a critique. Confirm a real riding clip produces timestamped observations. If the key is missing, the UI displays an explicit setup message.

The handler limits request size, frame count, output tokens, and duration. Each invited user gets five attempts per UTC day with a one-minute cooldown. These limits are enforced atomically in Postgres across devices and Edge Function instances. A valid request reserves one credit before calling OpenAI; provider failures and timeouts still consume that credit. Missing API configuration, invalid frames and denied requests do not consume credits. If the quota database is unavailable, the function does not call OpenAI. Configure provider project spend/rate limits before wider use; API requests incur usage charges. No critique history is stored. Private database tables track the current usage day, count and last request per user, plus owner-managed settings. Requests use `store: false`; OpenAI's API data policies still apply.

This is sampled-frame feedback, not continuous motion analysis. It can miss events between frames and cannot establish soundness, saddle fit, or official scores.

References: https://developers.openai.com/api/docs/guides/images-vision and https://supabase.com/docs/guides/functions/auth

## Durable quota installation and settings

Migration `20261028180322_durable_video_critique_limits` has been applied to Saddle School, and the updated function is deployed. For another installation, apply `supabase/migrations/20261028180322_durable_video_critique_limits.sql` once after the base schema and before deploying the function. It creates private, RLS-enabled tables with no browser access, and a service-role-only RPC (`saddle_critique_quota`). The Edge Function always passes the user ID obtained from JWT verification, never from the request body. Users cannot reset or increase their own allowance.

The owner can change limits in the SQL editor:

```sql
update saddle_private.critique_settings
set daily_limit = 5, cooldown_seconds = 60
where singleton = true;
```

Daily reset is midnight UTC (5 p.m. the previous calendar day in Arizona). Changes take effect on the next quota check. The UI shows the reset in the user's local time. This is a per-user request limit, not a dollar budget or an app-wide cap; total costs still depend on the number of users and API pricing.

The quota tables deliberately have no client RLS policies: only the server role can access them. The Supabase advisor reports this default-deny design as informational.
