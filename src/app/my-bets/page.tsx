import PageShell from "@/components/PageShell";
import MyBetsClient from "./MyBetsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MyBetsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(196,150,62,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(90,54,18,0.32),transparent_40%)]">
      <PageShell
        title="My Rhino Bets"
        subtitle="See your current picks, historical bets, wins, losses, and Rhino Coin payouts."
      >
        <MyBetsClient />
      </PageShell>
    </div>
  );
}
