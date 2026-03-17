# EAS Credentials Setup — My Wildest Dreams

## Overview
EAS Build handles credentials automatically via `eas credentials` CLI.
This file documents what you need and where to get it.

---

## iOS Credentials

EAS can auto-generate and manage all of these — run `eas credentials` and
choose **iOS → production → Manage credentials**.

| Credential | What It Is | How to Get It |
|---|---|---|
| Apple ID | Your Apple developer email | appleid.apple.com |
| Apple Team ID | 10-char string (e.g. `AB12CD34EF`) | developer.apple.com → Membership |
| App Store Connect App ID | Numeric app ID | appstoreconnect.apple.com → App → General → App Information |
| Distribution Certificate | `.p12` file + password | EAS auto-generates or Keychain Access |
| Provisioning Profile | `.mobileprovision` | EAS auto-generates via App ID |
| Push Notification Key | `.p8` APN key file | developer.apple.com → Keys |

### iOS Quick Start
```bash
# Log in to EAS
eas login

# Auto-generate and store iOS credentials in EAS servers
eas credentials --platform ios

# Or let EAS handle it during build (recommended for solo devs)
eas build --platform ios --profile development
# → EAS will prompt: "Generate new certificate?" → Yes
```

### Fill in eas.json
```json
"ios": {
  "appleId": "you@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "AB12CD34EF"
}
```

---

## Android Credentials

| Credential | What It Is | How to Get It |
|---|---|---|
| Keystore | `.jks` signing file | EAS auto-generates |
| Key alias | String identifier for keystore entry | EAS sets this |
| Key password | Keystore password | EAS manages securely |
| Google Service Account JSON | API key for Play Store submissions | play.google.com/console → Setup → API access |

### Android Quick Start
```bash
# EAS auto-generates and stores keystore — do NOT lose it
eas credentials --platform android

# Or auto-handle during build
eas build --platform android --profile development
```

### Google Service Account (for `eas submit`)
1. Go to Google Play Console → **Setup → API access**
2. Link to a Google Cloud project
3. Create a Service Account with **Release Manager** role
4. Download the JSON key → save as `google-service-account.json`
5. Add `google-service-account.json` to `.gitignore` immediately

---

## Environment Secrets (never commit these)

Store sensitive values in EAS Secrets, not in code:

```bash
# Set secrets in EAS (encrypts at rest, injected at build time)
eas secret:create --scope project --name SUPABASE_URL --value "https://xxx.supabase.co"
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value "pk_live_..."

# List all secrets
eas secret:list
```

**Secrets that must be set in EAS before production build:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_APP_ENV`

Server-only secrets (never in client):
- `OPENAI_API_KEY` → set in Supabase Edge Function env, not EAS
- `STRIPE_SECRET_KEY` → Supabase Edge Function env only
- `RUNWAY_API_KEY` → Supabase Edge Function env only

---

## First Build Checklist

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in
eas login

# 3. Link project (generates projectId in app.json)
eas init

# 4. Set environment secrets
eas secret:create ...

# 5. Dev build (iOS simulator)
eas build --platform ios --profile development

# 6. Dev build (Android APK)
eas build --platform android --profile development

# 7. Install on device/simulator
eas build:run --platform ios
```

---

## Credential Storage Options

| Option | Recommended For |
|---|---|
| **EAS servers** (default) | Solo devs, small teams — EAS stores encrypted certs |
| **Local** (`--local`) | Full control, you manage the files yourself |
| **Custom keychain** | Enterprise / strict compliance requirements |

For **My Wildest Dreams** as a solo build: use EAS-managed credentials.
Run `eas credentials` anytime to view, rotate, or download stored certs.

---

## .gitignore additions (already included in scaffold)
```
.env
.env.local
google-service-account.json
*.p12
*.mobileprovision
*.p8
/credentials/
```
