import { supabase } from "@/lib/supabase";

export default async function TeamsPage() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black">Teams</h1>
          <p className="mt-4 text-red-400">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-black">Teams</h1>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team: any) => (
            <div
              key={team.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-3xl">
                🦏
              </div>

              <h2 className="text-2xl font-black">{team.name}</h2>

              {team.captain && (
                <p className="mt-2 text-neutral-400">
                  Captain: {team.captain}
                </p>
              )}

              {team.color && (
                <p className="mt-1 text-sm text-neutral-500">
                  Color: {team.color}
                </p>
              )}
            </div>
          ))}
        </div>

        {teams?.length === 0 && (
          <p className="mt-6 text-neutral-400">
            No teams have been added yet.
          </p>
        )}
      </div>
    </main>
  );
}