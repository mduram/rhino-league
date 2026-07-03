import PageShell from "@/components/PageShell";
import BettingTabsClient from "./BettingTabsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BettingPage() {
  return (
    <PageShell
      title="Rhino Bets"
      subtitle="Use Rhino Coins to predict Rhino League volleyball and FIFA World Cup matches.Do you have what it takes to be a top rhino-predictor?"
    >
      <BettingTabsClient />
    </PageShell>
  );
}


