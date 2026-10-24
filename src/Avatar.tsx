import { useState } from 'react';
import { tg } from './api';

// The player's own Telegram profile photo. If Telegram does not share one, the first letter of the name is shown.
export default function Avatar({ name, className = '', size }: { name: string; className?: string; size?: number }) {
  const url: string | undefined = tg()?.initDataUnsafe?.user?.photo_url;
  const [broken, setBroken] = useState(false);
  const letter = (name || 'P').slice(0, 1).toUpperCase();
  const box = size ? { width: size, height: size, fontSize: size * 0.42 } : undefined;
  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className={className}
        style={{ ...box, objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className={className} style={box} aria-hidden="true">{letter}</span>
  );
}
