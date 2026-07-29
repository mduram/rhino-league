export default function TeamLogo({
  logoUrl,
  teamName,
  league,
  size = "md",
}: {
  logoUrl?: string | null;
  teamName?: string | null;
  league?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-10 w-10 text-xl rounded-xl",
    md: "h-16 w-16 text-3xl rounded-2xl",
    lg: "h-24 w-24 text-5xl rounded-3xl",
  };

  const accentClasses =
    league === "competitive"
      ? "bg-[#C4963E] text-[#16070B] shadow-[#C4963E]/30"
      : "bg-[#A51C30] text-white shadow-[#A51C30]/35";

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={teamName ? `${teamName} logo` : "Team logo"}
        className={`${sizeClasses[size]} object-cover shadow-lg ring-2 ${
          league === "competitive" ? "ring-[#C4963E]/60" : "ring-[#A51C30]/60"
        }`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center shadow-lg ${accentClasses}`}
      aria-label={teamName ? `${teamName} default logo` : "Default team logo"}
    >
      🦏
    </div>
  );
}
