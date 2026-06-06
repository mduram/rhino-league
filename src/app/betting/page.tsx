import PageShell from "@/components/PageShell";
import BettingClient from "./BettingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BettingPage() {
  return (
    <PageShell
      title="Betting"
      subtitle="Use fake Rhino Coins to predict games. No real money, no cash-out, only glory."
    >
      <BettingClient />
    </PageShell>
  );
}