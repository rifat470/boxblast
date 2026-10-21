# BoxBlast v3 — সেটআপ ও আপডেট গাইড (Vercel + Supabase)

## v3 তে নতুন কী
- **১০টি লেভেল** (Rookie → Legend): মোট আয় অনুযায়ী লেভেল বাড়ে। খরচ করলে লেভেল কমে না।
- **লেভেল বাড়লে পুরো এপের কালার/লুক অটো বদলায়** (১০টি আলাদা থিম) + লেভেল-আপ পপআপ ও রিওয়ার্ড।
- **১০টি বক্স ডিজাইন** (Classic, Ocean, Emerald, Sunset, Royal, Rose, Neon, Lava, Gold, Diamond), প্রতি লেভেলে একটি আনলক।
- **Profile ট্যাব**: স্ট্যাটাস, বক্স কালেকশন, লেভেল লিস্ট, **How to play** (ইউজার ম্যানুয়াল), **Privacy** (পলিসি)।
- প্রত্যেক ইউজারের নিজস্ব রেফার লিংক (Friends ট্যাবে বড় করে দেখায়)।
- `public/privacy.html` — সম্পূর্ণ প্রাইভেসি পলিসি পেজ (`https://আপনার-অ্যাপ.vercel.app/privacy.html`)।
- ডাটা সুরক্ষা: প্লেয়ার রো ডিলিট করা যায় না, ব্যালেন্স নেগেটিভ হয় না, SQL রি-রান করলেও কিছু মোছে না।

## ডাটা কেন হারাবে না (গুরুত্বপূর্ণ)
- অ্যাকাউন্টের চাবি = **টেলিগ্রাম ইউজার আইডি**। এপ ডিলিট, লগআউট, নতুন ডিভাইস বা অন্য কারো রেফার লিংকে ঢুকলেও একই অ্যাকাউন্ট ও ব্যালেন্স ফেরত আসে।
- রেফার কোড শুধু **প্রথমবার** অ্যাকাউন্ট তৈরির সময় পড়া হয়। পুরোনো ইউজারের ক্ষেত্রে উপেক্ষা করা হয়।
- সব ডাটা Supabase এ থাকে, ব্রাউজারে না। আপডেট দিলে শুধু কোড বদলায়, ডাটাবেস রো বদলায় না।

## ১. পুরোনো ইউজারসহ আপডেট করার সঠিক ক্রম (এই ক্রম মানুন)
1. **আগে Supabase**: SQL Editor → New query → `supabase/schema.sql` পুরোটা পেস্ট → **Run**।
   এটা বারবার চালানো নিরাপদ; শুধু নতুন কলাম (`skin`, `total_blasts`) যোগ করে, কোনো ডাটা মোছে না।
   (ঐচ্ছিক কিন্তু ভালো: Supabase → Database → Backups থেকে আগে একটা ব্যাকআপ নিন।)
2. **তারপর কোড**: নতুন ফাইলগুলো GitHub এ পুশ করুন, Vercel অটো ডিপ্লয় করবে।
3. `https://আপনার-অ্যাপ.vercel.app/api/health` খুলুন। সব `true`/`ok` এবং `migration_v3: "ok"` হলে সব ঠিক।

> ক্রম উল্টো করলে (আগে কোড, পরে SQL) এপ কিছুক্ষণ error দেখাবে, কিন্তু ডাটা নষ্ট হবে না।

## ২. প্রথমবার সেটআপ
### Supabase
1. supabase.com এ নতুন প্রজেক্ট খুলুন।
2. `supabase/schema.sql` রান করুন।
3. **Settings → API** থেকে `Project URL` ও `service_role` key নিন (service_role কাউকে দেবেন না)।

### GitHub
```bash
git init
git add .
git commit -m "BoxBlast v3"
git branch -M main
git remote add origin https://github.com/<ইউজারনেম>/<রিপো>.git
git push -u origin main
```

### Vercel
1. **Add New → Project** → রিপো ইমপোর্ট (Framework: Vite)।
2. **Environment Variables** এ `.env.example` এর সব ভেরিয়েবল বসান।
3. Deploy।

### BotFather
- `/myapps` → Web App URL = আপনার Vercel লিংক।
- Direct link (`https://t.me/BOT/app`) পেলে `VITE_APP_LINK` এ বসান। এটা দিলেই প্রতিটি ইউজারের লিংক হবে `https://t.me/BOT/app?startapp=ref_<তার আইডি>`।
- চ্যানেল টাস্ক চাইলে: চ্যানেল বানান, বটকে admin করুন, `CHANNEL_USERNAME` বসান।

## ৩. প্রাইভেসি পলিসি
- `public/privacy.html` ফাইলের একদম নিচে `[YOUR_CONTACT_EMAIL_OR_TELEGRAM_USERNAME]` এর জায়গায় আপনার আসল যোগাযোগ বসান (ইমেইল বা টেলিগ্রাম)।
- লিংকটা Adsgram ফর্মে ও বটের About/Description এ দিতে পারেন।

## ৪. Adsgram (partner.adsgram.ai)
1. `docs/adsgram-resubmit.md` এর বার্তা সাপোর্টে পাঠান (আপনার URL বসিয়ে)। আগের প্ল্যাটফর্ম (ID 52207) রিভিউ না নিলে নতুন ডিপ্লয় URL দিয়ে নতুন প্ল্যাটফর্ম যোগ করুন।
2. অনুমোদনের পর **Reward** টাইপ ব্লক বানান।
   - **Reward URL**: `https://আপনার-অ্যাপ.vercel.app/api/ad-reward?userid=[userId]&secret=আপনার_AD_REWARD_SECRET`
   - ব্লক ID শুধু সংখ্যা (`int-` দিয়ে শুরু হলে সেটা Interstitial)।
3. ব্লক ID `VITE_ADSGRAM_BLOCK_ID` এ বসিয়ে Redeploy করুন।

## ৫. ভবিষ্যতে আবার আপডেট দিলে
- নতুন কোড পুশ করুন। যদি `supabase/schema.sql` বদলে থাকে, আগে সেটা Supabase এ রান করুন (নিরাপদ)।
- কখনো `drop table`, `truncate` বা `delete from players` চালাবেন না।

## ফাইল কাঠামো
- `src/` — ফ্রন্টএন্ড (React)। `theme.ts` এ লেভেল থিম ও বক্স ডিজাইনের রং।
- `api/` — সার্ভার (Vercel functions)। `api/_lib/config.ts` এ লেভেল, রিওয়ার্ড, ইকোনমি।
- `supabase/schema.sql` — ডাটাবেস।
- `USER_MANUAL.md` — ইউজার ম্যানুয়াল (ইংরেজি, এপের Guide এর অনুরূপ)।
