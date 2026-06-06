import PageShell from "@/components/PageShell";
import BettingClient from "./BettingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BettingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(196,150,62,0.20),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(90,54,18,0.35),transparent_40%)]">
      <PageShell
        title="Rhino Coin Betting"
        subtitle="Use fake Rhino Coins to predict games. No real money, no cash-out, only glory."
      >
        <BettingClient />
      </PageShell>
    </div>
  );
}