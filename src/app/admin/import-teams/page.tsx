import ImportTeamsClient from "./ImportTeamsClient";

export default function ImportTeamsPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white sm:text-5xl">
          Import Teams
        </h1>

        <p className="mt-3 max-w-2xl text-red-100/70">
          Import team names, captains, leagues, and logo links from a Google
          Sheet.
        </p>

        <div className="mt-8">
          <ImportTeamsClient />
        </div>
      </div>
    </main>
  );
}