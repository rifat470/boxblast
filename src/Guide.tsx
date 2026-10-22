const env = (import.meta as any).env || {};
const CONTACT: string = String(env.VITE_CONTACT || '').trim();
const CHARITY: string = String(env.VITE_CHARITY_NOTE || '').trim();

export default function Guide() {
  return (
    <div className="doc">
      <h2>How to play</h2>
      <ol>
        <li><b>Blast.</b> Nine crates hide one box. Tap the crate you think hides it. You get 3 tries per box. A yellow glint hints where the box went, but not every glint tells the truth. A first-try blast gives a bonus and builds a combo.</li>
        <li><b>Energy.</b> Every blast uses 1 energy. Every tap, hit or miss, costs 1 energy. Energy comes back by itself: +1 every 5 seconds.</li>
        <li><b>Upgrades.</b> Spend coins on Boosts (stronger blasts, bigger energy tank, faster recharge) and on Warehouse upgrades that earn coins every hour, even when the app is closed (up to 3 hours at a time, so come back often).</li>
        <li><b>Levels.</b> Your level grows with the total coins you have earned. Every new level changes the colours of the whole app, unlocks a new box design, adds extra energy and gives a reward you can claim in Profile.</li>
        <li><b>Earn.</b> Claim the daily reward (a streak gives more every day for 7 days), finish tasks and, if you want, watch an optional ad for bonus coins.</li>
        <li><b>Friends.</b> Open the Friends tab to get your own invite link. When a friend joins with it, you both get coins. Your friends’ progress is never taken from you.</li>
        <li><b>Leaderboard.</b> See where you stand among all players.</li>
      </ol>

      <h2>Ads</h2>
      <p>Ads are always optional and only start when you tap a “Watch ad” button (on the Blast tab to refill energy, and on the Earn tab for bonus coins). The game works fully without them. There is a limit of 10 ads per day.</p>

      <h2>About coins</h2>
      <p>Coins are in-game points. They have no cash value and cannot be withdrawn or exchanged for money.</p>
      {CHARITY && (<><h2>Our mission</h2><p>{CHARITY}</p></>)}

      <h2>Keeping your account</h2>
      <p>Your account belongs to your Telegram profile. Deleting the app, logging out or entering through an invite link never creates a second account and never resets your coins, levels or upgrades. App updates keep all of your data.</p>
      {CONTACT && <p className="small muted">Support: {CONTACT}</p>}
    </div>
  );
}

export function Privacy() {
  return (
    <div className="doc">
      <h2>Privacy Policy</h2>
      <p className="small muted">Short version. The full text is at <a href="/privacy.html" target="_blank" rel="noreferrer">/privacy.html</a>.</p>
      <p><b>Zero Personal Data.</b> We never collect any personal data. This is a Telegram-based game where Telegram automatically sets your in-game name. We never ask for any private information. Just play regularly and collect points and gems. The more you collect, the more benefits and exciting surprises await you in future updates!</p>
      <p><b>What we collect.</b> Your Telegram user ID and your game data: coins, levels, upgrades, invites and activity timestamps so your progress is saved.</p>
      <p><b>What we do not collect.</b> No phone number, email address, contacts, location or messages. We do not sell your data.</p>
      <p><b>Ads.</b> When you choose to watch an ad, our ad partner Adsgram receives your Telegram user ID to show the ad and confirm that it was watched.</p>
      <p><b>Storage.</b> Data is stored securely with our database provider.</p>
      <p><b>Your choices.</b> You can ask us to delete your data at any time.</p>
    </div>
  );
}
