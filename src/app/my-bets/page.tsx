import PageShell from "@/components/PageShell";
import MyBetsClient from "./MyBetsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MyBetsPage() {
  return (
    <PageShell
      title="My Rhino Bets"
      subtitle="See your current picks, historical bets, wins, losses, and Rhino Coin payouts."
    >
      <MyBetsClient />
    </PageShell>
  );
}