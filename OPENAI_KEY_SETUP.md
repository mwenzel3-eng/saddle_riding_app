# Create or replace the Saddle School OpenAI key

Use this guide for initial setup and when replacing an expiring key. One server-side key serves invited Saddle School users; users do not need their own keys.

## 1. Create the key in OpenAI

1. Sign in to [OpenAI API keys](https://platform.openai.com/api-keys).
2. Select the OpenAI project you want to use for Saddle School. A separate project makes its usage easier to track.
3. Open [API billing](https://platform.openai.com/settings/organization/billing/overview) and configure payment or credits if required. API usage has its own billing; a ChatGPT subscription does not fund these app requests.
4. Click **Create new secret key** and give it a recognizable name, such as `Saddle School video critique`.
5. If the dialog offers an expiration, choose **90 days** as a starting point. Set a calendar reminder seven days before that date. If expiration is not available, use the same reminder to replace the key manually.
6. If choosing restricted permissions, allow creating Responses (`POST /v1/responses`) and access to the configured image-capable model. A read-only key cannot generate critiques.
7. Create the key and copy the full value immediately. Keep it in a password manager if you need to retain a copy; the full value may not be shown again.

Do not paste the key into chat, a Git commit, an issue, or a screenshot. Do not put it in `src/`, `config/public-cloud.json`, a `VITE_*` variable, or the web app's public build settings.

Official OpenAI documentation: [Developer quickstart](https://developers.openai.com/api/docs/quickstart) and [API authentication](https://developers.openai.com/api/reference/overview#authentication).

## 2. Save the key in Supabase

1. Open [Saddle School → Edge Function secrets](https://supabase.com/dashboard/project/zwnvoilwycnffkknpmkr/functions/secrets).
2. Confirm the selected project is **Saddle School**, project reference `zwnvoilwycnffkknpmkr`. Do not use the Rangebook project.
3. Add a secret, or update the existing secret, with these values:

   | Field | Value |
   | --- | --- |
   | Name | `OPENAI_API_KEY` |
   | Value | The full secret key copied from OpenAI |

4. Save the secret. Use the exact uppercase name, and paste the value without quotes, backticks, or an `OPENAI_API_KEY=` prefix.
5. If `OPENAI_API_KEY` already exists, replace its value under the same name. Do not delete Supabase's built-in secrets.

The deployed `video-critique` function reads this secret on the server. Saving or replacing it does not require redeploying the function or rebuilding the web app. The web app must separately have the AI coach changes deployed to display the upload interface.

`OPENAI_MODEL` is optional. Leave it unset to use the code's default, `gpt-4.1-mini`; creating a key does not require changing the model.

Official Supabase documentation: [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets).

## 3. Verify in the app

1. Open the updated Saddle School app and sign in with an invited account.
2. Open **AI coach**.
3. Choose a riding clip under 50 MB and no longer than 60 seconds, or choose a saved clip.
4. Enter a feedback question, agree to sending sampled frames to OpenAI, and click **Critique my video**.
5. Confirm a critique appears with a saved confirmation and the remaining daily allowance decreases by one.
6. Leave AI coach and reopen it. Expand the new entry under **Saved critiques** to confirm the feedback reloads from your account.

The test makes a paid API request and uses one of the user's five daily attempts. Provider failures and timeouts also use a credit once an AI request has been reserved. The app enforces a 60-second cooldown and resets daily allowances at midnight UTC, which is 5 p.m. in Arizona.

## 4. Replace a key before it expires

1. Create a new OpenAI key using section 1 while the old key is still valid.
2. Replace the existing `OPENAI_API_KEY` value in Supabase with the new key and save.
3. Test one critique using section 3.
4. After confirming success, revoke/delete the old key in OpenAI. If it was shared with another service, update that service first.
5. Update your password manager and set a reminder for the replacement key's expiration.

If a key is exposed, revoke it immediately and replace it. If a key expires before replacement, critiques will fail until a valid key is saved; the rest of the app does not depend on this key.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| “AI setup is pending” | Save `OPENAI_API_KEY` in the Saddle School project's Edge Function secrets. Check the name and project. |
| Provider authentication or model error | Check that the key is complete, unexpired, not revoked, and permitted to create Responses using the configured model. |
| API quota or billing error | Check OpenAI API billing, available credits, usage limits, and model access. |
| Daily allowance exhausted | Wait for the reset time shown in the app. Replacing the key does not reset user allowances. |
| No AI upload interface | Deploy the updated web app, then reload it. For the native iPhone app, rebuild/sync its bundled web assets. |

See [AI_SETUP.md](AI_SETUP.md) for backend setup, usage-limit settings, and the limitations of sampled-frame feedback. Key expiration is a rotation measure, not a spending cap; monitor API usage separately.
