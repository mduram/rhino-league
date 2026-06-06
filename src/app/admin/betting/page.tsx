import AdminBettingClient from "./AdminBettingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminBettingPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white sm:text-5xl">
          Betting Admin
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Settle Rhino Coin predictions after scores have been submitted and
          games are marked completed. Winning picks receive their Rhino Coin
          payout, losing picks are marked lost.
        </p>

        <div className="mt-8">
          <AdminBettingClient />
        </div>
      </div>
    </main>
  );
}