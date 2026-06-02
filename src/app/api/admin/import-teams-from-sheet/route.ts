import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

const REQUIRED_COLUMNS = {
  league: "Recreational or Competitive League",
  captain: "Captain Name",
  teamName: "Team Name",
  logo: "Upload a team logo (for the website)",
};

const MAX_LOGO_SIZE = 8 * 1024 * 1024;

function getGoogleSheetCsvUrl(sheetUrl: string) {
  const idMatch = sheetUrl.match(/\/spreadsheets\/d\/([^/]+)/);
  const gidMatch = sheetUrl.match(/[?&]gid=([^&]+)/);

  if (!idMatch?.[1]) {
    throw new Error("Could not find Google Sheet ID in the provided URL.");
  }

  const spreadsheetId = idMatch[1];
  const gid = gidMatch?.[1];

  if (gid) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((csvRow) =>
    csvRow.some((cell) => cell.trim().length > 0)
  );
}

function normalizeHeader(header: string) {
  return header.trim().replace(/\s+/g, " ");
}

function normalizeLeague(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("comp")) {
    return "competitive";
  }

  if (normalized.includes("rec")) {
    return "recreational";
  }

  return "recreational";
}

function rowToObject(headers: string[], row: string[]) {
  const object: Record<string, string> = {};

  headers.forEach((header, index) => {
    object[header] = row[index]?.trim() || "";
  });

  return object;
}

function extractFirstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s,"]+/);
  return match?.[0] || value.trim();
}

function getGoogleDriveFileId(url: string) {
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  const openIdMatch = url.match(/[?&]id=([^&]+)/);
  if (openIdMatch?.[1]) return openIdMatch[1];

  const ucIdMatch = url.match(/[?&]id=([^&]+)/);
  if (ucIdMatch?.[1]) return ucIdMatch[1];

  return null;
}

function getDownloadableLogoUrl(rawLogoUrl: string) {
  const firstUrl = extractFirstUrl(rawLogoUrl);

  if (!firstUrl) return null;

  const fileId = getGoogleDriveFileId(firstUrl);

  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return firstUrl;
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("jpg")) return "jpg";

  return "jpg";
}

async function uploadLogoFromUrl({
  rawLogoUrl,
  teamName,
}: {
  rawLogoUrl: string;
  teamName: string;
}) {
  const downloadableUrl = getDownloadableLogoUrl(rawLogoUrl);

  if (!downloadableUrl) {
    return {
      logoUrl: null,
      logoStoragePath: null,
      logoStatus: "no_logo",
      logoMessage: "No logo URL provided.",
    };
  }

  const logoResponse = await fetch(downloadableUrl, {
    cache: "no-store",
    redirect: "follow",
  });

  if (!logoResponse.ok) {
    return {
      logoUrl: null,
      logoStoragePath: null,
      logoStatus: "logo_fetch_failed",
      logoMessage: `Could not fetch logo. HTTP ${logoResponse.status}. The Drive file may not be publicly viewable.`,
    };
  }

  const contentType = logoResponse.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    return {
      logoUrl: null,
      logoStoragePath: null,
      logoStatus: "logo_private_or_not_image",
      logoMessage:
        "Google returned an HTML page instead of an image. The logo file is probably private.",
    };
  }

  if (!contentType.startsWith("image/")) {
    return {
      logoUrl: null,
      logoStoragePath: null,
      logoStatus: "logo_not_image",
      logoMessage: `Logo URL did not return an image. Content-Type: ${contentType || "unknown"}`,
    };
  }

  const arrayBuffer = await logoResponse.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_LOGO_SIZE) {
    return {
      logoUrl: null,
      logoStoragePath: null,
      logoStatus: "logo_too_large",
      logoMessage: "Logo is too large. Max size is 8 MB.",
    };
  }

  const extension = extensionFromContentType(contentType);
  const fileName = `${safeSlug(teamName)}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const storagePath = `logos/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("team-logos")
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return {
      logoUrl: null,
      logoStoragePath: null,
      logoStatus: "supabase_upload_failed",
      logoMessage: uploadError.message,
    };
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("team-logos")
    .getPublicUrl(storagePath);

  return {
    logoUrl: publicUrlData.publicUrl,
    logoStoragePath: storagePath,
    logoStatus: "uploaded_to_supabase",
    logoMessage: "Logo copied to Supabase Storage.",
  };
}

export async function POST(request: Request) {
  const body = await request.json();

  const { adminToken, sheetUrl } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "Google Sheet URL is required." },
      { status: 400 }
    );
  }

  let csvUrl = "";

  try {
    csvUrl = getGoogleSheetCsvUrl(sheetUrl);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Invalid Google Sheet URL." },
      { status: 400 }
    );
  }

  const sheetResponse = await fetch(csvUrl, {
    cache: "no-store",
  });

  if (!sheetResponse.ok) {
    return NextResponse.json(
      {
        error:
          "Could not read the Google Sheet. Make sure sharing is set to 'Anyone with the link can view'.",
        status: sheetResponse.status,
      },
      { status: 500 }
    );
  }

  const csvText = await sheetResponse.text();

  if (csvText.toLowerCase().includes("<html")) {
    return NextResponse.json(
      {
        error:
          "Google returned an HTML page instead of CSV. The sheet is probably not public/readable.",
      },
      { status: 500 }
    );
  }

  const parsedRows = parseCsv(csvText);

  if (parsedRows.length < 2) {
    return NextResponse.json(
      { error: "No team rows found in the sheet." },
      { status: 400 }
    );
  }

  const headers = parsedRows[0].map(normalizeHeader);
  const dataRows = parsedRows.slice(1);

  const missingColumns = Object.values(REQUIRED_COLUMNS).filter(
    (requiredColumn) => !headers.includes(requiredColumn)
  );

  if (missingColumns.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required columns: ${missingColumns.join(", ")}`,
        foundColumns: headers,
      },
      { status: 400 }
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let logosUploaded = 0;
  let logosFailed = 0;
  let logosMissing = 0;

  const details: Array<{
    teamName: string;
    action: "created" | "updated" | "skipped";
    reason?: string;
    logoStatus?: string;
    logoMessage?: string;
  }> = [];

  for (const row of dataRows) {
    const rowObject = rowToObject(headers, row);

    const teamName = rowObject[REQUIRED_COLUMNS.teamName]?.trim();
    const captain = rowObject[REQUIRED_COLUMNS.captain]?.trim() || null;
    const league = normalizeLeague(rowObject[REQUIRED_COLUMNS.league] || "");
    const rawLogoUrl = rowObject[REQUIRED_COLUMNS.logo]?.trim() || "";

    if (!teamName) {
      skipped += 1;
      details.push({
        teamName: "(blank)",
        action: "skipped",
        reason: "Missing team name",
      });
      continue;
    }

    const logoImport = await uploadLogoFromUrl({
      rawLogoUrl,
      teamName,
    });

    if (logoImport.logoStatus === "uploaded_to_supabase") {
      logosUploaded += 1;
    } else if (logoImport.logoStatus === "no_logo") {
      logosMissing += 1;
    } else {
      logosFailed += 1;
    }

    const { data: existingTeams, error: lookupError } = await supabaseAdmin
      .from("teams")
      .select("id, name, logo_url, logo_storage_path")
      .ilike("name", teamName);

    if (lookupError) {
      skipped += 1;
      details.push({
        teamName,
        action: "skipped",
        reason: lookupError.message,
        logoStatus: logoImport.logoStatus,
        logoMessage: logoImport.logoMessage,
      });
      continue;
    }

    const existingTeam = existingTeams?.[0];

    const updatePayload: Record<string, any> = {
      name: teamName,
      captain,
      league,
    };

    if (logoImport.logoUrl) {
      updatePayload.logo_url = logoImport.logoUrl;
      updatePayload.logo_storage_path = logoImport.logoStoragePath;
    }

    if (existingTeam) {
      const { error: updateError } = await supabaseAdmin
        .from("teams")
        .update(updatePayload)
        .eq("id", existingTeam.id);

      if (updateError) {
        skipped += 1;
        details.push({
          teamName,
          action: "skipped",
          reason: updateError.message,
          logoStatus: logoImport.logoStatus,
          logoMessage: logoImport.logoMessage,
        });
        continue;
      }

      updated += 1;
      details.push({
        teamName,
        action: "updated",
        logoStatus: logoImport.logoStatus,
        logoMessage: logoImport.logoMessage,
      });

      continue;
    }

    const insertPayload: Record<string, any> = {
      name: teamName,
      captain,
      league,
      color: null,
      logo_url: logoImport.logoUrl,
      logo_storage_path: logoImport.logoStoragePath,
    };

    const { error: insertError } = await supabaseAdmin
      .from("teams")
      .insert(insertPayload);

    if (insertError) {
      skipped += 1;
      details.push({
        teamName,
        action: "skipped",
        reason: insertError.message,
        logoStatus: logoImport.logoStatus,
        logoMessage: logoImport.logoMessage,
      });
      continue;
    }

    created += 1;
    details.push({
      teamName,
      action: "created",
      logoStatus: logoImport.logoStatus,
      logoMessage: logoImport.logoMessage,
    });
  }

  return NextResponse.json({
    success: true,
    created,
    updated,
    skipped,
    logosUploaded,
    logosFailed,
    logosMissing,
    details,
  });
}