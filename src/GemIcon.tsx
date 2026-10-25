// The real gem artwork (public/gems). Small, optimised WebP files so the app stays light.
//  icon: the gem alone (lists, goals, ladder)   pop: gem on its gold pedestal (popups)   tile: the framed card with the name
export default function GemIcon({
  id,
  size = 44,
  dim = false,
  variant = 'icon',
}: {
  id: string;
  size?: number;
  dim?: boolean;
  variant?: 'icon' | 'pop' | 'tile';
}) {
  const file = variant === 'icon' ? id : `${variant}-${id}`;
  const ratio = variant === 'tile' ? 0.92 : variant === 'pop' ? 0.77 : 1;
  return (
    <img
      src={`/gems/${file}.webp`}
      alt=""
      draggable={false}
      loading="lazy"
      width={size}
      height={Math.round(size * ratio)}
      style={{
        width: size,
        height: 'auto',
        display: 'block',
        filter: dim ? 'grayscale(1) brightness(.42)' : undefined,
        opacity: dim ? 0.9 : 1,
        userSelect: 'none',
      }}
    />
  );
}
