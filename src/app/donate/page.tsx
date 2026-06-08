import Link from "next/link";
import PageShell from "@/components/PageShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supportUrl = process.env.NEXT_PUBLIC_DONATION_URL || "";



export default function DonatePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(196,150,62,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(165,28,48,0.20),transparent_40%)]">
      <PageShell
        title="Support the Rhino League"
        subtitle="Optional contributions to help keep the league running, hosted, and properly rhino-powered."
      >
        <div className="grid gap-8">
          <section className="overflow-hidden rounded-[2rem] border border-[#C4963E]/35 bg-[#1A0F08]/95 p-8 shadow-2xl shadow-black/40">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
                  Support
                </p>

                <h2 className="text-4xl font-black text-white sm:text-5xl">
                  Help keep the Rhino League going 🦏
                </h2>

                <p className="mt-5 text-lg leading-8 text-red-100/75">
                  If you enjoy the Rhino League, consider supporting the league to help with
                  website hosting costs, ordering supplies for the court, and
                  food/drinks for the commissioner.
                </p>

                <p className="mt-4 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 text-sm leading-6 text-[#F3EEE6]">
                  Support is completely optional and does not affect standings, schedules,
                  eligibility, betting, Rhino Coin balances, or playoff seeding.
                  This is just a way to support the league.
                </p>

                <div className="mt-7 flex flex-wrap gap-4">
                  {supportUrl ? (
                    <a
                      href={supportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#C4963E] px-7 py-4 font-black text-[#16070B] shadow-lg shadow-[#C4963E]/25 transition hover:bg-[#D7AA4A]"
                    >
                      Support the league
                    </a>
                  ) : (
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-red-200">
                      Support link is not configured yet. Add{" "}
                      <code className="rounded bg-black/30 px-2 py-1">
                        NEXT_PUBLIC_DONATION_URL
                      </code>{" "}
                      to your environment variables.
                    </div>
                  )}

                  <Link
                    href="/"
                    className="rounded-full border border-[#F3EEE6]/20 bg-white/[0.06] px-7 py-4 font-black text-white transition hover:bg-white/10"
                  >
                    Back home
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#C4963E]/25 bg-black/25 p-6">
                <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-[#F3EEE6]">
                  What support helps with
                </p>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-[#C4963E]/20 bg-[#C4963E]/10 p-4">
                    <p className="font-black text-white">
                      Website hosting
                    </p>
                    <p className="mt-1 text-sm leading-6 text-red-100/65">
                      Domain, hosting, database/storage, and keeping the site
                      online.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#C4963E]/20 bg-[#C4963E]/10 p-4">
                    <p className="font-black text-white">
                      Court supplies
                    </p>
                    <p className="mt-1 text-sm leading-6 text-red-100/65">
                      New lines, fixing the net, making sure the court is safe and ready to play
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#C4963E]/20 bg-[#C4963E]/10 p-4">
                    <p className="font-black text-white">
                      Commissioner fuel
                    </p>
                    <p className="mt-1 text-sm leading-6 text-red-100/65">
                      Food and drinks for the person keeping this whole chaotic
                      rhino machine running.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
            <h2 className="text-2xl font-black text-white">
              Safety / transparency note
            </h2>

            <p className="mt-3 leading-7 text-red-100/70">
              Payments are handled through Stripe’s secure checkout page, not by
              this website. The Rhino League site does not collect or store card
              details.
            </p>

          </section>
        </div>
      </PageShell>
    </div>
  );
}