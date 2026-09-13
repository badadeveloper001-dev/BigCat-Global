# Interface language

English and Simplified Chinese interface strings use lib/locales/zh.json and zh-patterns.json. UiText handles static app copy, UiValue handles app-authored status or configuration labels, and UiAttributes translates placeholders and accessible labels without changing input values. Merchant-authored names, descriptions and chat content remain separate from the interface catalogue. Existing chat translation still requires its configured provider.

Vercel country headers suggest CN -> Chinese/CNY and NG -> English/NGN on a first visit. Stored preferences take priority; browser language/timezone is a fallback when detection is unavailable. Country detection is not province or city detection. New country defaults leave region empty instead of inventing Lagos or Guangdong. VPNs and browser hints can affect the result.

Verification: node tests/pilot-localization.cjs checks language-only rendering for legal/help/pilot pages, templates, form values, retained merchant setup and country defaults. Real devices/networks in Nigeria and mainland China remain required for regional acceptance testing.

Merchant session restoration now retains the database setup flag and refreshes the profile after authentication. Unknown profile state offers retry/sign-out rather than overwriting store setup.

Admin portal accepts account credentials before its backend code check. Assign a separate verified account using scripts/033-assign-admin-account.sql; do not convert your active merchant account. Missing role, account login, session secret, access code and Redis configuration are reported separately.
