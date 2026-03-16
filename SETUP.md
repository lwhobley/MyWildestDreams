# My Wildest Dreams — New Supabase Project Setup

## 1. Create a new Supabase project
Go to https://supabase.com → New Project.

## 2. Run the schema migration
In the Supabase SQL editor, paste and run:
`supabase/migrations/00001_initial_schema.sql`

This creates all tables, RLS policies, indexes, triggers,
the storage bucket, and seeds the Symbol Encyclopedia.

## 3. Enable OAuth providers
Supabase Dashboard → Authentication → Providers:

**Google**
- Enable Google provider
- Add Client ID and Client Secret from Google Cloud Console
- Authorised redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Apple**
- Enable Apple provider  
- Add Team ID, Key ID, and private key (.p8 file) from developer.apple.com
- Service ID: `com.mywildestdreams.app`

## 4. Set Edge Function secrets
Supabase Dashboard → Edge Functions → Secrets → Add new:

| Secret name              | Value                              |
|--------------------------|------------------------------------|
| `GEMINI_API_KEY         | Your Google AI Studio key               |

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.)

## 5. Deploy edge functions
```bash
npx supabase functions deploy analyze-dream
npx supabase functions deploy transcribe-audio
npx supabase functions deploy generate-dream-image
```

## 6. Update .env
Copy `.env.example` → `.env` and fill in your new project's URL and anon key.

## 7. Storage bucket
The migration creates the `dream-thumbnails` bucket automatically.
Verify it exists in: Supabase Dashboard → Storage.

## 8. (Android only) Google Services
Download `google-services.json` from Firebase Console → Project Settings
and place it in the project root.

## 9. Install new dependencies
```bash
npx expo install expo-apple-authentication
```
