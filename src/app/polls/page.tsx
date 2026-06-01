import { supabase } from "@/lib/supabase";
import PollClient from "./PollClient";

export default async function PollsPage() {
  const { data: polls, error } = await supabase
    .from("polls")
    .select(`
      id,
      question,
      active,
      poll_options (
        id,
        label,
        votes
      )
    `)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-black">Polls</h1>
          <p className="mt-4 text-red-400">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-black">Polls</h1>

        <div className="grid gap-6">
          {polls?.map((poll: any) => (
            <PollClient key={poll.id} poll={poll} />
          ))}
        </div>

        {polls?.length === 0 && (
          <p className="text-neutral-400">No active polls yet.</p>
        )}
      </div>
    </main>
  );
}