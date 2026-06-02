export default function LeagueBadge({
  league,
  className = "",
}: {
  league?: string | null;
  className?: string;
}) {
  const normalizedLeague = league || "recreational";

  const styles =
    normalizedLeague === "competitive"
      ? "border-[#C4963E]/60 bg-[#C4963E]/20 text-[#F3EEE6]"
      : "border-[#A51C30]/70 bg-[#A51C30]/35 text-red-100";

  const dotStyles =
    normalizedLeague === "competitive" ? "bg-[#C4963E]" : "bg-[#A51C30]";

  const label =
    normalizedLeague === "competitive" ? "Competitive" : "Recreational";

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${styles} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyles}`} />
      {label}
    </span>
  );
}