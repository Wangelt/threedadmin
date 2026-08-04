type Props = {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  rounded?: "none" | "sm" | "md";
};

export function Thumb({
  src,
  alt = "",
  size = 44,
  className = "",
  rounded = "sm",
}: Props) {
  const radius =
    rounded === "none" ? "rounded-none" : rounded === "md" ? "rounded-md" : "rounded";

  if (!src) {
    return (
      <div
        className={`thumb flex shrink-0 items-center justify-center bg-[#f4f4f4] text-[10px] font-semibold uppercase tracking-wide text-muted ${radius} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        No img
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`thumb shrink-0 ${radius} ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

export function ThumbStack({
  urls,
  size = 40,
  max = 3,
}: {
  urls?: (string | undefined | null)[];
  size?: number;
  max?: number;
}) {
  const list = (urls || []).filter(Boolean).slice(0, max) as string[];
  if (!list.length) return <Thumb size={size} rounded="none" />;

  return (
    <div className="flex items-center">
      {list.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: list.length - i }}
        >
          <Thumb src={url} size={size} className="ring-2 ring-[var(--card)]" rounded="none" />
        </div>
      ))}
    </div>
  );
}
