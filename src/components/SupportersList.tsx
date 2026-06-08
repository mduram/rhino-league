import { supabase } from "@/lib/supabase";

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null || amount === undefined) return "";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency || ""}`;
  }
}

export default async function SupportersList() {
  const { data: supporters, error } = await supabase
    .from("kofi_supporters")
    .select("id, supporter_name, amount, currency, message, type, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return (
      <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        Could not load supporters: {error.message}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[#C4963E]/30 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/30">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
            Supporters
          </p>

          <h2 className="text-3xl font-black text-white">
            Recent Rhino Support
          </h2>
        </div>

        <p className="text-sm text-red-100/55">
          Showing public Ko-fi support only.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {(supporters || []).length === 0 && (
          <p className="rounded-2xl border border-[#C4963E]/20 bg-black/25 p-4 text-red-100/60">
            No public supporters yet. Be the first rhino.
          </p>
        )}

        {(supporters || []).map((supporter) => (
          <article
            key={supporter.id}
            className="rounded-2xl border border-[#C4963E]/20 bg-black/25 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">
                  {supporter.supporter_name || "Anonymous Rhino"}
                </p>

                <p className="mt-1 text-xs text-red-100/45">
                  {new Date(supporter.created_at).toLocaleString()}
                </p>
              </div>

              {supporter.amount !== null && supporter.amount !== undefined && (
                <span className="rounded-full bg-[#C4963E] px-4 py-2 text-sm font-black text-[#16070B]">
                  {formatAmount(supporter.amount, supporter.currency)}
                </span>
              )}
            </div>

            {supporter.message && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-100/75">
                “{supporter.message}”
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}