import { supabase } from "@/lib/supabase";
import AdminForms from "./AdminForms";

export default async function AdminPage() {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .order("scheduled_at", { ascending: false });

  if (teamsError || gamesError) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-black">Rhino League Admin</h1>
          <p className="mt-4 text-red-400">
            {teamsError?.message || gamesError?.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-black">Rhino League Admin</h1>

        <AdminForms teams={teams || []} games={games || []} />
      </div>
    </main>
  );
}