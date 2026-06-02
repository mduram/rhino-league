import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";

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
        {list.map((team: any) => (
          <div
            key={team.id}
            className="rounded-3xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-3xl shadow-lg shadow-orange-500/25">
              🦏
            </div>

            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              {team.league} league
            </p>

            <h2 className="text-2xl font-black text-white">{team.name}</h2>

            {team.captain && (
              <p className="mt-2 text-neutral-400">Captain: {team.captain}</p>
            )}

            {team.color && (
              <p className="mt-1 text-sm text-neutral-500">
                Color: {team.color}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <PageShell
      title="Teams"
      subtitle="Competitive and recreational teams, all fighting for the same eventual playoff chaos."
    >
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-black text-white">Competitive</h2>
        <TeamGrid list={competitiveTeams} />
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black text-white">Recreational</h2>
        <TeamGrid list={recreationalTeams} />
      </section>
    </PageShell>
  );
}