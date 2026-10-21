# BoxBlast v2 — সেটআপ গাইড (Vercel + Supabase)

## ১. Supabase
1. supabase.com এ নতুন প্রজেক্ট খুলুন।
2. **SQL Editor → New query** এ `supabase/schema.sql` এর পুরো লেখা পেস্ট করে **Run** চাপুন।
3. **Settings → API** থেকে `Project URL` আর `service_role` key কপি করুন (service_role key কাউকে দেবেন না)।

## ২. GitHub + Vercel
1. এই ফোল্ডার GitHub এ আপলোড করুন (পুরোনো `.aistudio` ফোল্ডার আর পুরোনো zip আর রাখবেন না)।
2. Vercel এ **Add New → Project** করে রিপো ইমপোর্ট করুন (Framework: Vite)।
3. **Settings → Environment Variables** এ `.env.example` এর সব ভ্যালু বসান, তারপর Deploy করুন।

## ৩. BotFather
- `/myapps` এ অ্যাপের Web App URL = আপনার Vercel লিংক।
- Main Mini App বা direct link (`https://t.me/BOT/app`) পেলে `VITE_APP_LINK` এ বসান (রেফারেল লিংকের জন্য)।
- চ্যানেল টাস্ক চাইলে: চ্যানেল বানান, বটকে চ্যানেলের admin করুন, `CHANNEL_USERNAME` বসান।

## ৪. Adsgram (partner.adsgram.ai)
1. আগের declined প্ল্যাটফর্ম আর কাজ করবে না। নতুন ভার্সন Deploy হওয়ার পর support এ লিখুন (নিচে `docs/adsgram-resubmit.md` দেখুন)।
2. প্ল্যাটফর্ম অনুমোদন হলে **Reward** টাইপের ব্লক বানান।
   - **Reward URL**: `https://আপনার-অ্যাপ.vercel.app/api/ad-reward?userid=[userId]&secret=আপনার_AD_REWARD_SECRET`
   - ব্লক ID শুধু সংখ্যা (যেমন `12345`)। `int-` দিয়ে শুরু হলে সেটা Interstitial, Reward না।
3. ব্লক ID টা Vercel এ `VITE_ADSGRAM_BLOCK_ID` এ বসিয়ে Redeploy করুন।
4. ব্লকও মডারেশনে যায়। সাধারণত ৪-৬ ঘণ্টা (উইকএন্ডে ৬-১০)।

## ৫. টেস্ট
- টেলিগ্রামে বট খুলে খেলুন। ব্রাউজারে খুললে "Open inside Telegram" দেখাবে, এটা ঠিক আছে।
- অ্যাড টেস্টে `src/ads.ts` এ `Adsgram.init({ blockId, debug: true })` দিতে পারেন, কিন্তু প্রোডাকশনে `debug` মুছে ফেলুন।

## কী কী আছে
- সার্ভার-যাচাইকৃত লগইন (Telegram initData HMAC), সব কয়েন/এনার্জি/আপগ্রেড সার্ভারে।
- বক্স-ব্লাস্ট গেম + এনার্জি, বুস্ট, প্যাসিভ ইনকামের ওয়্যারহাউস আপগ্রেড।
- ডেইলি রিওয়ার্ড, টাস্ক, রেফারেল (সার্ভারে গোনা), লিডারবোর্ড।
- ঐচ্ছিক রিওয়ার্ডেড অ্যাড: শুধু বাটনে ট্যাপ করলে চলে, Adsgram এর server callback দিয়ে যাচাই হয়, দিনে সর্বোচ্চ ১০টা।

## সাপ্তাহিক রক্ষণাবেক্ষণ
Supabase SQL Editor এ: `delete from public.ad_events where created_at < now() - interval '2 days';`
