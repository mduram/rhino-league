import PageShell from "@/components/PageShell";
import TwitchStreamClient from "./TwitchStreamClient";

export default function StreamsPage() {
  return (
    <PageShell
      title="Rhino League Live"
      subtitle="Follow playoff broadcasts and live game coverage from Harvard Rhino Cup on Twitch."
    >
      <TwitchStreamClient />
    </PageShell>
  );
}
