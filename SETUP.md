# Building Management Dashboard - Setup Guide

This guide will walk you through setting up the Building Management Dashboard with Next.js, Convex, and Clerk authentication.

## Prerequisites

Before starting, make sure you have:
- Node.js 18+ installed
- A Node.js package manager (npm, pnpm, or yarn)
- A Clerk account (https://clerk.com)
- A Convex account (https://convex.dev)

---

## Step 1: Clone and Install Dependencies

Navigate to the project directory and install dependencies:

```bash
cd home_mangement
npm install
```

---

## Step 2: Set Up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Configure the following:
   - Name: "Building Management"
   - Enable "Email" and "Username" sign-in
4. Copy your API keys:
   - **Publishable Key**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret Key**: `CLERK_SECRET_KEY`

---

## Step 3: Set Up Convex

1. Install Convex CLI:
```bash
npm install convex
```

2. Log in to Convex:
```bash
npx convex dev
```

3. This will:
   - Create a Convex project
   - Generate the `NEXT_PUBLIC_CONVEX_URL` environment variable
   - Start the Convex dev server

---

## Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_WEBHOOK_SECRET=your_webhook_secret

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 5: Initialize the Database Schema

Push your schema to Convex:

```bash
npx convex dev
```

In a separate terminal, run:

```bash
npx convex db push
```

This will create the following tables:
- `apartments` - 12 units (6 floors × 2 apartments)
- `tenants` - Tenant information
- `payments` - Payment tracking
- `maintenance` - Maintenance and expense tracking

---

## Step 6: Seed the Database

Run the seed script to populate sample data:

```bash
npx convex run --script scripts/seed.ts
```

This will create:
- 12 apartments with different rent amounts ($550-$800)
- 12 tenants with active leases
- Sample payments for the current month (mixed statuses)
- Sample maintenance records

---

## Step 7: Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 8: Set Up Cron Jobs (Optional)

The cron jobs are defined in `convex/crons.ts`. To enable them:

1. In the Convex Dashboard, go to "Cron Jobs"
2. Add the following scheduled jobs:

### Monthly Payment Generation
- **Function**: `generateMonthlyPayments`
- **Schedule**: Run on the 1st of every month at 00:00
- **Description**: Creates pending payment records for all active tenants

### Late Payment Detection
- **Function**: `checkAndMarkLatePayments`
- **Schedule**: Run daily at 01:00
- **Description**: Checks pending payments and marks overdue ones as "late"

---

## Project Structure

```
home_mangement/
├── app/
│   ├── layout.tsx              # Root layout with Clerk/Convex providers
│   ├── page.tsx                # Main dashboard
│   ├── providers.tsx           # Convex and Clerk providers
│   └── globals.css            # Global styles
├── components/
│   └── dashboard/
│       ├── BuildingGrid.tsx    # 6×2 apartment grid
│       ├── KPICard.tsx         # KPI metric cards
│       └── Sidebar.tsx         # Navigation sidebar
├── convex/
│   ├── schema.ts               # Database schema
│   ├── crons.ts                # Automated cron jobs
│   ├── apartments.ts           # Apartment queries/mutations
│   ├── tenants.ts              # Tenant queries/mutations
│   ├── payments.ts             # Payment queries/mutations
│   └── maintenance.ts          # Maintenance queries/mutations
├── lib/
│   └── utils.ts                # Utility functions
├── scripts/
│   └── seed.ts                # Database seeding script
├── middleware.ts               # Clerk authentication middleware
└── .env.example               # Environment variables template
```

---

## Features

### Dashboard
- **KPI Cards**: Total Revenue, Collected, Outstanding, Occupancy Rate
- **Building Grid**: Visual 6×2 grid with status color-coding
- **Alerts**: Payment alerts for late/pending payments

### Payment Status Colors
| Status | Color | Description |
|--------|-------|-------------|
| Paid | Green | Payment received |
| Pending | Yellow | Awaiting payment |
| Late | Red | Past due date |
| Partial | Purple | Partial payment received |
| Vacant | Gray | No tenant |
| Maintenance | Blue | Under maintenance |

### Automated Tasks
1. **Monthly Payment Generation**: Automatically creates pending payments on the 1st of each month
2. **Late Payment Detection**: Daily check to mark overdue payments as "late"

---

## Troubleshooting

### TypeScript Errors
If you see TypeScript module errors, make sure:
1. Dependencies are installed: `npm install`
2. Convex is running: `npx convex dev`

### Authentication Issues
- Verify Clerk keys in `.env.local`
- Check middleware.ts configuration

### Database Issues
- Run `npx convex db push` to update schema
- Check Convex Dashboard for error logs

---

## Next Steps

After setup, you can:
1. Add more pages (`/apartments`, `/tenants`, `/payments`, `/maintenance`)
2. Customize the UI components
3. Add more automated cron jobs
4. Integrate with payment gateways

---

## Support

For issues or questions, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)

---

## Currency Migration Note (v2.0.0+)

**Important:** Starting from version 2.0.0, the application uses Egyptian Pound (EGP) as the default currency instead of US Dollar (USD).

### Changes Made
- [`lib/utils.ts:17`](lib/utils.ts): `formatCurrency()` now formats amounts as EGP using `ar-EG` locale

### Impact on Existing Data
- Existing rent amounts in the database are stored as raw numbers without currency metadata
- All amounts will now display as EGP regardless of their original intended currency
- **If you have existing data**: You may need to either:
  1. Leave amounts as-is (if they represent EGP values)
  2. Run a data migration to convert USD amounts to EGP (multiply by current exchange rate ~50-55 EGP/USD)

### Seed Data
The seed script now uses EGP values (e.g., apartment rents are in the range of 15,000-25,000 EGP).
