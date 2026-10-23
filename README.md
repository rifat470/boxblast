# BoxBlast v5 (Adsgram + Monetag + TADS, Daily Tasks)

## 1. Supabase (run FIRST, safe to repeat)
Run `supabase/migration_v5.sql` in the Supabase SQL Editor. Open `/api/health`: `migration_v5` must say `ok`.

## 2. Reward confirmation URLs (without them nobody gets an ad reward)
| Network | Where | URL |
|---|---|---|
| Adsgram (block 55501) | Block settings, Reward URL | `https://YOUR-APP.vercel.app/api/ad-reward?userid=[userId]&secret=AD_REWARD_SECRET` |
| Monetag (zone 12108818) | Zone settings, Postback | `https://YOUR-APP.vercel.app/api/monetag-postback?secret=AD_REWARD_SECRET&ymid={ymid}&event_type={event_type}&reward_event_type={reward_event_type}&telegram_id={telegram_id}&zone_id={zone_id}` |
| TADS (widget 12842, Fullscreen) | Widget settings, Webhook URL | `https://YOUR-APP.vercel.app/api/tads-webhook?secret=AD_REWARD_SECRET` |

## 3. Where each ad appears
- Earn tab, DAILY TASKS: row 1 Adsgram, row 2 Monetag, row 3 TADS. Rows 2 and 3 use Adsgram if their own network has no ad within 5 seconds.
- Blast tab, refill energy: Monetag first, then Adsgram.
- Earn tab, bonus coins: Adsgram first, then Monetag.
- Earn tab, daily reward x2: TADS first, then Adsgram.
All ads are optional and only start when the player taps a button.

---

# BoxBlast v4 — Complete Setup & Architecture Guide

A production-ready Telegram Mini App game built with React, TypeScript, Tailwind CSS, Vercel Serverless Functions, and Supabase PostgreSQL.

---

## What's New in v4

1. **Server-Authoritative Game Logic**: All energy replenishment, coin calculations, boosts, level progression, and task completions are strictly validated server-side.
2. **Real Rewarded Ads (Adsgram)**: Adsgram shows the rewarded video, and our secure backend webhook (`/api/ad-reward`) verifies completion before crediting energy, coins, or gems.
3. **10 Progression Tiers & Box Designs**: Levels are derived directly from `total_earned` coins (Rookie, Novice, Adept, Skilled, Elite, Veteran, Master, Champion, Legend, Boss). Levels never decrease when spending coins.
4. **Referral Ladder (1 to 100 Friends)**: Milestone rewards from 1 to 100 friends with coin bonuses and 6 collectible gems (Moonstone, Radiant Onyx, Silver Star, Royal Ruby, Sapphire, Eternal Diamond).
5. **Daily Streak Rewards with Optional 2x Multiplier**: Players can claim their consecutive daily reward, with the option to watch an ad to double it.
6. **Energy System**: 1 tap costs 1 energy (hit or miss). Energy regenerates continuously (+1 every 5s base, upgradable). Instant refill via optional rewarded ad (up to 10 per day).
7. **Telegram Bot Webhook (`api/bot.ts`)**: Handles `/start` commands and referral invite links (`startapp=ref_ID`).
8. **Responsive UI & Overlap-Free Profile**: 3 dedicated sub-tabs inside Profile: *My Profile*, *How to Play*, and *Privacy Policy*.
9. **Zero Data Loss Guarantee**: Player accounts are tied to Telegram numeric User IDs. Updating code or running SQL migrations never deletes or resets player progress.

---

## Database Migration (Supabase)

### If updating an existing database:
1. Open your Supabase Dashboard: **SQL Editor** -> **New query**.
2. Copy and paste the contents of `supabase/migration_v4.sql`.
3. Click **Run**.
*(This migration is safe and idempotent: it adds the `gems` and `total_blasts` columns and creates the `ad_events` table without modifying existing player rows.)*

### If setting up from scratch:
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** -> **New query**.
3. Copy and paste the full `supabase/schema.sql`.
4. Click **Run**.
5. Go to **Project Settings** -> **API** and copy your `Project URL` and `service_role` secret key.

---

## Deployment Guide

### 1. GitHub
```bash
git init
git add .
git commit -m "BoxBlast v4 - 100% English release"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

### 2. Vercel
1. In Vercel, click **Add New** -> **Project** and import your repository (Framework: **Vite**).
2. In **Environment Variables**, configure the variables from `.env.example`:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` secret key.
   - `BOT_TOKEN`: Your Telegram bot token from @BotFather.
   - `AD_REWARD_SECRET`: A secure random secret string (e.g. generated via `openssl rand -hex 16`).
   - `VITE_ADSGRAM_BLOCK_ID`: Your Adsgram reward block ID (numeric digits only).
   - `VITE_BOT_LINK`: `https://t.me/<YourBotUsername>`
   - `VITE_APP_LINK`: `https://t.me/<YourBotUsername>/<YourShortAppName>` (from BotFather `/myapps`).
   - `VITE_CONTACT`: Support username or email.
   - `WEBHOOK_SECRET`: (Optional) Secret token for Telegram bot webhook.
3. Click **Deploy**.

### 3. Telegram Bot Setup (@BotFather)
1. Message `@BotFather` on Telegram.
2. Use `/myapps` -> Select your Mini App -> **Edit Web App URL** -> set it to your Vercel deployment URL (e.g. `https://your-app.vercel.app`).
3. Set your Bot description and menu button to point to your Mini App.
4. (Optional) Set Telegram bot webhook for referral deep linking:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/bot&secret_token=<WEBHOOK_SECRET>
   ```

### 4. Adsgram Monetization Setup (partner.adsgram.ai)
1. In your Adsgram dashboard, create a **Reward** block type.
2. Set the **Reward URL** to:
   ```
   https://your-app.vercel.app/api/ad-reward?userid=[userId]&secret=<YOUR_AD_REWARD_SECRET>
   ```
3. Set `VITE_ADSGRAM_BLOCK_ID` in your Vercel Environment Variables to your numeric block ID and redeploy.

---

## Health Check Endpoint
After deployment, visit:
```
https://your-app.vercel.app/api/health
```
This endpoint checks your environment variables and Supabase connection, confirming `migration_v4: "ok"` and `players_table: "ok"`.

---

## Project Structure

```
├── api/
│   ├── _lib/
│   │   ├── auth.ts          # Telegram initData cryptographic validation
│   │   ├── config.ts        # Economy, levels, boosts, gems, tasks configuration
│   │   ├── db.ts            # Supabase database helpers with optimistic locking
│   │   └── game.ts          # Core game actions (blast, boosts, upgrades, claims)
│   ├── ad-reward.ts         # Secure Adsgram server-to-server reward callback
│   ├── bot.ts               # Optional Telegram bot webhook for /start referrals
│   ├── game.ts              # Primary API router handling state mutations & sync
│   └── health.ts            # System diagnostic and configuration verification
├── public/
│   └── privacy.html         # Full legal privacy policy page
├── src/
│   ├── App.tsx              # Main application root, audio, overlays, navigation
│   ├── CrateVisual.tsx      # High-performance 3D visual renderer for 10 crate tiers
│   ├── Earn.tsx             # Daily check-in, optional rewarded ads, task board
│   ├── Friends.tsx          # Referral ladder (1-100), sharing tools, leaderboard
│   ├── GemIcon.tsx          # SVG gem asset renderer for 6 collectible gem tiers
│   ├── Guide.tsx            # In-app gameplay manual and summary privacy notice
│   ├── Mine.tsx             # Passive warehouse income cards and active boosts
│   ├── ParticleBackground.tsx # GPU-accelerated canvas background ambience
│   ├── Play.tsx             # Packing Yard 3x3 interactive blast crate game
│   ├── Profile.tsx          # My Profile, How to Play, and Privacy Policy sub-tabs
│   ├── ads.ts               # Adsgram SDK client integration with retry resilience
│   ├── api.ts               # Client-side API caller and Telegram WebApp hooks
│   ├── effects.ts           # Synthesized Web Audio effects and confetti particle engine
│   ├── index.css            # Responsive layout and tier-based glowing animations
│   ├── main.tsx             # Application mount point
│   └── theme.ts             # Level palettes, gradient definitions, and design tokens
├── supabase/
│   ├── migration_v4.sql     # Safe idempotent SQL migration for v4
│   └── schema.sql           # Complete standalone PostgreSQL schema
├── USER_MANUAL.md           # In-depth user manual and gameplay mechanics
├── README_BN.md             # বাংলা সংস্করণ (Bengali setup documentation)
└── README.md                # English setup documentation
```
