import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import LeagueBadge from "@/components/LeagueBadge";
import TeamLogo from "@/components/TeamLogo";
import TeamNameLink from "@/components/TeamNameLink";

export default async function TeamsPage() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .order("league", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <PageShell title="Teams">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  const competitiveTeams =
    teams?.filter((team: any) => team.league === "competitive") || [];

  const recreationalTeams =
    teams?.filter((team: any) => team.league === "recreational") || [];

  function TeamGrid({ list }: { list: any[] }) {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((team: any) => {
          const cardAccent =
            team.league === "competitive"
              ? "border-[#C4963E]/35"
              : "border-[#A51C30]/35";

          return (
            <div
              key={team.id}
              className={`rounded-3xl border bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30 ${cardAccent}`}
            >
              <div className="mb-4">
                <TeamLogo
                  logoUrl={team.logo_url}
                  teamName={team.name}
                  league={team.league}
                  size="md"
                />
              </div>

              <LeagueBadge league={team.league} className="mb-3" />

              <TeamNameLink
                team={team}
                className="block text-2xl font-black text-white"
              />

              {team.captain && (
                <p className="mt-2 text-red-100/70">
                  Captain: {team.captain}
                </p>
              )}

              {team.color && (
                <p className="mt-1 text-sm text-red-100/45">
                  Color: {team.color}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PageShell
      title="Teams"
      subtitle="Competitive and recreational teams, all fighting for the same eventual playoff chaos."
    >
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-2xl font-black text-white">Competitive</h2>
          <LeagueBadge league="competitive" />
        </div>

        <TeamGrid list={competitiveTeams} />
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-2xl font-black text-white">Recreational</h2>
          <LeagueBadge league="recreational" />
        </div>

        <TeamGrid list={recreationalTeams} />
      </section>
    </PageShell>
  );
}