import { useState } from 'react';
import { fmt } from './api';
import type { Ctx } from './App';
import { LEVELS_CONFIG, getLevelConfig } from './theme';
import { IconLock, IconBlast, IconBolt, IconUp, IconFriends } from './icons';
import GemIcon from './GemIcon';

type ProfileSubTab = 'profile' | 'howto' | 'privacy';

interface ProfileProps {
  ctx: Ctx;
}

export default function Profile({ ctx }: ProfileProps) {
  const { s, act, flash } = ctx;
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileSubTab>('profile');

  const claim = async (lvl: number) => {
    const r = await act('claimLevel', { lvl });
    if (r) flash(`Level ${lvl} reward +${fmt(r.result.reward)}`);
  };

  const equip = async (id: string) => {
    const r = await act('setSkin', { id });
    if (r) flash('Box design changed');
  };

  // Safe level progress calculation
  const curLvl = s.level.lvl || 1;
  const curConfig = getLevelConfig(curLvl);
  const nextConfig = curLvl < 10 ? getLevelConfig(curLvl + 1) : null;
  const targetXp = nextConfig ? nextConfig.minXp : curConfig.maxXp;
  const startXp = curConfig.minXp;
  const xpProgress = Math.max(0, Math.min(100, Math.round(((s.totalEarned - startXp) / Math.max(1, targetXp - startXp)) * 100)));

  return (
    <div className="w-full flex flex-col gap-4 min-h-0 overflow-y-auto pb-10">
      {/* Sub-tab buttons row: [My Profile] [How to Play] [Privacy Policy] */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 pb-1">
        <button
          type="button"
          onClick={() => setActiveProfileTab('profile')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold tracking-wide transition-all ${
            activeProfileTab === 'profile'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.55)] scale-102'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
          }`}
        >
          My Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveProfileTab('howto')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold tracking-wide transition-all ${
            activeProfileTab === 'howto'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.55)] scale-102'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
          }`}
        >
          How to Play
        </button>
        <button
          type="button"
          onClick={() => setActiveProfileTab('privacy')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold tracking-wide transition-all ${
            activeProfileTab === 'privacy'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.55)] scale-102'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
          }`}
        >
          Privacy Policy
        </button>
      </div>

      {/* TAB 1: MY PROFILE */}
      {activeProfileTab === 'profile' && (
        <div className="w-full flex flex-col gap-4">
          {/* Top User Card */}
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Big 'M' Avatar with Golden Glow */}
              <div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 text-2xl font-black flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)] border-2 border-amber-200/50 shrink-0"
                aria-hidden="true"
              >
                {(s.name || 'M').slice(0, 1).toUpperCase()}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="text-xl font-black text-white truncate leading-tight">
                  {s.name || 'M'}
                </div>
                <div className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                  <span className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Level {curLvl} {curConfig.name}
                  </span>
                  <span className="text-slate-400 font-medium">· ID: {s.id}</span>
                </div>
              </div>
            </div>

            {/* Level progress bar inside top card */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-300">
                  Level {curLvl} {curConfig.name}
                </span>
                <span className="text-amber-400">
                  {fmt(s.totalEarned)} / {fmt(targetXp)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${xpProgress}%`,
                    background: curConfig.barGradient || 'linear-gradient(90deg, #ff7e40, #ffc107)',
                  }}
                />
              </div>
            </div>

            {/* 3 Stats: Total earned, Boxes blasted, Friends invited */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/5">
              <div className="bg-[#1a2232] rounded-xl p-2.5 text-center border border-white/5">
                <div className="text-base sm:text-lg font-black text-amber-400 leading-tight">
                  {fmt(s.totalEarned)}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Total earned
                </div>
              </div>

              <div className="bg-[#1a2232] rounded-xl p-2.5 text-center border border-white/5">
                <div className="text-base sm:text-lg font-black text-white leading-tight">
                  {fmt(s.totalBlasts)}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Boxes blasted
                </div>
              </div>

              <div className="bg-[#1a2232] rounded-xl p-2.5 text-center border border-white/5">
                <div className="text-base sm:text-lg font-black text-amber-400 leading-tight">
                  {s.refCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Friends invited
                </div>
              </div>
            </div>
          </div>

          {/* Gem Collection */}
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-white m-0">Gem Collection</h3>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {s.gems.reduce((a, g) => a + g.count, 0)} gems
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {s.gems.map((g) => (
                <div key={g.id} className={'gem-slot' + (g.count > 0 ? ' own' : '')}>
                  <GemIcon id={g.id} size={46} dim={g.count === 0} />
                  <b>{g.name}</b>
                  <small>{g.count > 0 ? `x${g.count}` : 'Not yet'}</small>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
              Earn gems by inviting friends (Friends tab) and by watching optional ads (Earn tab). Gems are collectibles and have no cash value.
            </p>
          </div>

          {/* Friends Invited Section */}
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-white m-0">Friends Invited</h3>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {s.refCount} Total
              </span>
            </div>

            {s.refCount === 0 ? (
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                  <IconFriends />
                </div>
                <div className="text-sm font-bold text-slate-200">
                  0 Friends invited - Invite to earn
                </div>
                <p className="text-xs text-slate-400 max-w-xs m-0">
                  Earn +2,500 coins for every friend who joins via your invite link, and they get +1,000 coins too!
                </p>
              </div>
            ) : (
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
                {s.refCount} friend{s.refCount === 1 ? '' : 's'} joined with your link. Open the Friends tab to claim invite rewards and gems.
              </div>
            )}
          </div>

          {/* Box Designs Section */}
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div>
              <h3 className="text-base font-extrabold text-white m-0">Box Designs</h3>
              <p className="text-xs text-slate-400 mt-1 mb-0">
                A new design unlocks at every level. Tap an unlocked one to equip it.
              </p>
            </div>

            {/* Grid 5 columns on desktop, 3 columns on mobile, gap-4 */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 pt-1">
              {LEVELS_CONFIG.map((cfg) => {
                const skinData = s.skins.find((sk) => sk.level === cfg.lvl);
                const isUnlocked = Boolean(skinData?.unlocked);
                const isEquipped = s.skin === `lv${cfg.lvl}`;

                return (
                  <button
                    key={cfg.lvl}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => isUnlocked && equip(`lv${cfg.lvl}`)}
                    className={`flex flex-col items-center justify-between p-3 rounded-xl border text-center transition-all min-h-[118px] relative ${
                      isEquipped
                        ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-102 ring-1 ring-amber-400/50'
                        : isUnlocked
                        ? 'border-slate-700 bg-slate-800/80 hover:border-slate-500 hover:bg-slate-700/80 cursor-pointer'
                        : 'border-slate-800/80 bg-slate-900/50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Visual Box Thumbnail */}
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center shadow-inner relative border"
                      style={{
                        backgroundColor: cfg.boxBg,
                        borderColor: isEquipped ? '#ffc107' : 'rgba(255,255,255,0.2)',
                        boxShadow: `0 0 10px ${cfg.boxGlow}`,
                      }}
                    >
                      {/* Box Tape / Detail Accent */}
                      <div className="w-full h-1.5 bg-black/20 absolute" />
                      <div className="h-full w-1.5 bg-black/20 absolute" />
                      <span className="text-[10px] font-black text-white/90 drop-shadow">
                        {cfg.lvl}
                      </span>
                    </div>

                    {/* Box Label */}
                    <div className="text-xs font-bold text-white mt-1.5 truncate max-w-full">
                      {cfg.name}
                    </div>

                    {/* Lock / Unlocked Status Badge */}
                    <div className="mt-1">
                      {isEquipped ? (
                        <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">
                          In Use
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <IconLock /> Lv {cfg.lvl}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level Rewards Claiming Section */}
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div>
              <h3 className="text-base font-extrabold text-white m-0">Level Rewards</h3>
              <p className="text-xs text-slate-400 mt-1 mb-0">
                Your level comes from the coins you have earned in total. Spending coins never lowers it.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {s.levels.map((l) => (
                <div
                  key={l.lvl}
                  className="bg-[#18202d] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col">
                    <div className="text-xs sm:text-sm font-bold text-white">
                      Level {l.lvl}: {l.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {l.at === 0 ? 'Starting level' : `Earn ${fmt(l.at)} coins in total`}
                      {l.reward > 0 ? ` · Reward +${fmt(l.reward)}` : ''}
                    </div>
                  </div>

                  {l.lvl > 1 && (
                    <button
                      type="button"
                      disabled={!l.reached || l.claimed}
                      onClick={() => claim(l.lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        l.claimed
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : l.reached
                          ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] hover:bg-amber-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {l.claimed ? 'Claimed' : l.reached ? 'Claim' : 'Locked'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Account Safety Guarantee */}
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 shadow-lg">
            <h3 className="text-sm font-extrabold text-white m-0 flex items-center gap-1.5">
              <span>🛡️</span> Your Account Is Safe
            </h3>
            <p className="text-xs text-slate-400 mt-2 mb-0 leading-relaxed">
              Your game progress is linked directly to your Telegram account (ID: {s.id}). Deleting the app or switching devices will restore all your coins, upgrades, and levels automatically.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: HOW TO PLAY */}
      {activeProfileTab === 'howto' && (
        <div className="w-full flex flex-col gap-4">
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-white m-0">How to Play BoxBlast</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-0">
                Master the packing yard and climb through 10 explosive box ranks!
              </p>
            </div>

            {/* Steps 1 to 5 */}
            <div className="flex flex-col gap-3">
              {/* Step 1 */}
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <IconBlast />
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">Step 1:</span> Find & Blast Crates
                  </div>
                  <p className="text-xs text-slate-300 mt-1 mb-0 leading-relaxed">
                    Nine crates hide one target box. Tap the crate you think hides it! You get 3 attempts per box. A yellow glint hints where the box went, but not every glint is honest. Blasting on the first try earns a bonus and builds a combo.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
                  <IconBolt />
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">Step 2:</span> Manage Energy
                  </div>
                  <p className="text-xs text-slate-300 mt-1 mb-0 leading-relaxed">
                    Every tap (hit or miss) costs 1 energy. Energy comes back by itself: +1 every 5 seconds. You can also watch an optional ad to refill your tank instantly (up to 10 ads per day).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <IconUp />
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">Step 3:</span> Upgrade Yard Equipment
                  </div>
                  <p className="text-xs text-slate-300 mt-1 mb-0 leading-relaxed">
                    Spend coins on Boosts (Blast power, Energy Tank, Recharge Speed) and Warehouse Automation (Forklifts, Conveyor Belts, Barcode Scanners) to generate passive hourly coin income even while the game is closed!
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                  <span className="text-lg font-black">Lv</span>
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">Step 4:</span> Level Up (Rookie to Boss)
                  </div>
                  <p className="text-xs text-slate-300 mt-1 mb-0 leading-relaxed">
                    Your level depends only on the total coins you have earned. Nothing else can raise it. There are 10 tiers: Rookie, Novice, Adept, Skilled, Elite, Veteran, Master, Champion, Legend and Boss. Each tier changes the look of the game and unlocks a new box design.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <IconFriends />
                </div>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span className="text-amber-400">Step 5:</span> Invites, Daily Streaks & Tasks
                  </div>
                  <p className="text-xs text-slate-300 mt-1 mb-0 leading-relaxed">
                    Claim your daily reward every day for a growing streak. Open Daily Tasks in the Earn tab: three optional ads a day give coins, a full energy refill and a bonus chest with a rare gem! Invite friends with your personal link: you both get coins, and invite milestones from 1 to 100 friends give bonus coins and rare gems.
                  </p>
                </div>
              </div>
            </div>

            {/* About In-game Coins */}
            <div className="bg-[#18202d]/60 border border-white/5 rounded-xl p-3.5">
              <div className="text-xs font-bold text-amber-400">Fair Play & Coin Disclaimer</div>
              <p className="text-xs text-slate-400 mt-1 mb-0 leading-relaxed">
                All coins and gems in BoxBlast are virtual in-game items for entertainment. They have no cash or cryptocurrency value and cannot be withdrawn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY POLICY */}
      {activeProfileTab === 'privacy' && (
        <div className="w-full flex flex-col gap-4">
          <div className="bg-[#151b27] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-white m-0">Privacy Policy</h2>
              <p className="text-xs text-slate-400 mt-1 mb-0">
                Transparent and privacy-first gaming for all Telegram users.
              </p>
            </div>

            {/* Main Privacy Statement requested by user */}
            <div className="bg-[#18202d] border border-amber-500/30 rounded-xl p-4 flex flex-col gap-2 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <b className="text-amber-400 text-sm font-bold">Privacy Statement</b>
              </div>
              <p className="m-0 text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                We never collect any personal data. This is a Telegram-based game where Telegram automatically sets your in-game name. We never ask for any private information. Just play regularly and collect points and gems. The more you collect, the more benefits and exciting surprises await you in future updates!
              </p>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
                <b className="text-white text-sm font-bold">1. Information We Collect</b>
                <p className="m-0 text-slate-300">
                  We never collect any personal data. This is a Telegram-based game where Telegram automatically sets your in-game name. We never ask for any private information.
                </p>
              </div>

              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
                <b className="text-white text-sm font-bold">2. How We Use Information</b>
                <p className="m-0 text-slate-300">
                  Just play regularly and collect points and gems. The more you collect, the more benefits and exciting surprises await you in future updates!
                </p>
              </div>

              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
                <b className="text-white text-sm font-bold">3. What We Never Collect</b>
                <p className="m-0 text-slate-300">
                  We never request or access your private messages, contacts, phone number, location, financial accounts, or device storage. We never sell user data.
                </p>
              </div>

              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
                <b className="text-white text-sm font-bold">4. Optional Advertising</b>
                <p className="m-0 text-slate-300">
                  Ads in BoxBlast are completely optional. When you choose to tap an ad button to refill energy or earn coins, our ad partner Adsgram receives your Telegram user ID to show the ad and confirm that it was watched.
                </p>
              </div>

              <div className="bg-[#18202d] border border-white/5 rounded-xl p-3.5 flex flex-col gap-1.5">
                <b className="text-white text-sm font-bold">5. Data Retention & Deletion</b>
                <p className="m-0 text-slate-300">
                  Game data is securely saved with our encrypted database provider. You may request complete deletion of your game records at any time by contacting our support channel.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
