import PageShell from "@/components/PageShell";
import BettingTabsClient from "./BettingTabsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BettingPage() {
  return (
    <PageShell
      title="Rhino Bets"
      subtitle="Use Rhino Coins to predict the 2026 Rhino League playoffs. Do you have what it takes to be the top Rhino predictor?"
    >
      <BettingTabsClient />
    </PageShell>
  );
}

