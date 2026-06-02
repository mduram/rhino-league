import AutoSchedulerClient from "./AutoSchedulerClient";

export default function AutoSchedulerPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white sm:text-5xl">
          Smart Auto-Scheduler
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Automatically create and schedule games using team league, availability
          text, preferred times, and preferred day notes.
        </p>

        <div className="mt-8">
          <AutoSchedulerClient />
        </div>
      </div>
    </main>
  );
}