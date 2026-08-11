This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🔐 Security Model

Home Management is a **single-admin property-management app** with its own
email/password auth (no third-party provider). The backend is split into public
auth flows and admin-only data handlers.

| Claim | Reality |
|---|---|
| **Authentication** | ✅ Custom email/password: `signUp`, `signIn`, `verifyEmailToken`, `resetPassword` are public by design; stored passwords are salted hashes. |
| **Authorization** | ✅ Every data handler (`apartments`, `invoices`, `documents`, `maintenance`, `payments`, `summaries`, `tenants`) calls a local `requireAdmin()` — unauthenticated calls get "Unauthorized: Authentication required". |
| **Token verification** | ✅ `convex/http.ts` exposes OIDC discovery + JWKS routes (`/api/auth/...`) so the app can verify session JWTs server-side. |

**Required environment variables:**

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `.env.local` | app origin (OIDC issuer) |
| `CONVEX_SITE_URL` | Convex deployment env | site URL for HTTP routes |

⚠️ **Known hardening items** (from the 2026 security audit): the legacy
`auth.createUserWithHash` / `storeSession` / `storeVerificationToken` handlers
were removed — they were exported with **zero callers** and could forge accounts
and sessions. `auth.getUserForAuth` remains **public by design**: the
`/api/auth/signin` and `/api/auth/validate` routes need the stored
`passwordHash`/`passwordSalt` to run bcrypt comparison — but it means the
hashes are readable by anyone who knows an email; consider moving password
verification into a Convex action so hashes never leave the backend. The
`emails.sendWelcomeEmail` / `sendPaymentReminder` actions are public (spam
vectors). Remove or guard them.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
