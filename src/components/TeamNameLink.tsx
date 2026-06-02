import Link from "next/link";

export default function TeamNameLink({
  team,
  className = "",
}: {
  team?: {
    id?: string | null;
    name?: string | null;
  } | null;
  className?: string;
}) {
  const name = team?.name || "Team";

  if (!team?.id) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link
      href={`/teams/${team.id}`}
      className={`transition hover:text-[#F3EEE6] hover:underline hover:decoration-[#A51C30] hover:decoration-2 hover:underline-offset-4 ${className}`}
    >
      {name}
    </Link>
  );
}