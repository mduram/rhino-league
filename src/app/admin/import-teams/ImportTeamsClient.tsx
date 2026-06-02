"use client";

import { useEffect, useState } from "react";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1f0A9JAlqibIAknOmjLiCTDtPFlA8HP69vUzkC7jqq68/edit?usp=sharing";

export default function ImportTeamsClient() {
  const [adminToken, setAdminToken] = useState("");
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  async function importTeams(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    setIsImporting(true);

    const res = await fetch("/api/admin/import-teams-from-sheet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        sheetUrl,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Import failed. Status: ${res.status}`);
      setResult(data);
      setIsImporting(false);
      return;
    }

    setResult(data);
    setMessage(
      `Import complete. Created ${data.created}, updated ${data.updated}, skipped ${data.skipped}. Logos uploaded ${data.logosUploaded}, failed ${data.logosFailed}, missing ${data.logosMissing}.`
    );
    setIsImporting(false);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">
          Google Sheet Import
        </h2>

        {adminToken ? (
          <p className="mb-4 text-green-300">Admin mode active.</p>
        ) : (
          <p className="mb-4 text-red-100">
            You are not logged in. Go to /admin/login first.
          </p>
        )}

        <form onSubmit={importTeams} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Google Sheet URL
            </span>

            <input
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </label>

          <button
            disabled={isImporting}
            className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
          >
            {isImporting ? "Importing and copying logos..." : "Import Teams"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      {result?.details && (
        <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Import Details
          </h2>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-300">
                Logos Uploaded
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.logosUploaded || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">
                Logos Failed
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.logosFailed || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-100/60">
                Logos Missing
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.logosMissing || 0}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-[#A51C30]/20 text-left">
                <tr>
                  <th className="p-3">Team</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Logo Status</th>
                  <th className="p-3">Message</th>
                </tr>
              </thead>

              <tbody>
                {result.details.map((detail: any, index: number) => (
                  <tr key={index} className="border-t border-[#A51C30]/20">
                    <td className="p-3 font-bold text-white">
                      {detail.teamName}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          detail.action === "created"
                            ? "bg-green-500/15 text-green-300"
                            : detail.action === "updated"
                              ? "bg-[#C4963E]/20 text-[#F3EEE6]"
                              : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {detail.action}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          detail.logoStatus === "uploaded_to_supabase"
                            ? "bg-green-500/15 text-green-300"
                            : detail.logoStatus === "no_logo"
                              ? "bg-white/10 text-red-100/60"
                              : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {detail.logoStatus || "none"}
                      </span>
                    </td>

                    <td className="p-3 text-red-100/60">
                      {detail.reason || detail.logoMessage || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-[#A51C30]/25 bg-black/20 p-5 text-sm text-red-100/60">
        <p className="font-bold text-red-100">What this importer does:</p>

        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Reads teams from the Google Sheet.</li>
          <li>Downloads each submitted logo from Google Drive.</li>
          <li>Uploads each logo into the Supabase team-logos bucket.</li>
          <li>Saves the Supabase public URL in the teams table.</li>
        </ul>

        <p className="mt-4">
          If logo upload fails, the Google Drive file is probably not public.
          Set the Google Forms upload folder, or the individual files, to
          “Anyone with the link can view,” then run the importer again.
        </p>
      </section>
    </div>
  );
}