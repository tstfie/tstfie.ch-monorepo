export const prerender = false;
import type { APIRoute } from "astro";

/* ================================
   Helpers
================================= */
function jsonError(code: string, status = 400) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonSuccess(data: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/* ================================
   POST handler
================================= */
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    /* ================================
       Honeypot (anti-bot)
    ================================= */
    const honeypot = formData.get("company");
    if (honeypot && String(honeypot).length > 0) {
      return jsonSuccess(); // silently succeed for bots
    }

    /* ================================
       Extract + sanitize fields
    ================================= */
    const email = String(formData.get("email") || "").trim();
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const message = String(formData.get("message") || "").trim();

    /* ================================
       Validation
    ================================= */
    if (!email) return jsonError("email_required");
    if (!email.includes("@") || email.length > 254) return jsonError("invalid_email");
    if (firstName.length > 100 || lastName.length > 100) return jsonError("name_too_long");
    if (message.length > 2000) return jsonError("message_too_long");

    /* ================================
       Interests → Brevo list mapping
    ================================= */
    const LIST_MAP: Record<string, number[]> = {
      designs: [8],
      music: [9],
      other: [10],
    };

    const interests = formData
      .getAll("interest")
      .map(v => String(v))
      .filter(v => v in LIST_MAP);

    if (interests.length === 0) return jsonError("no_interest");

    const listIds = [...new Set(interests.flatMap(i => LIST_MAP[i]))];

    /* ================================
       Brevo API request
    ================================= */
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY is missing in serverless environment");
      return jsonError("brevo_key_missing", 500);
    }

    let brevoRes;
    try {
      brevoRes = await fetch(
        "https://api.brevo.com/v3/contacts/doubleOptinConfirmation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY,
          },
          body: JSON.stringify({
            email,
            attributes: {
              FIRSTNAME: firstName || undefined,
              LASTNAME: lastName || undefined,
              MESSAGE: message || undefined,
              DOI_STATUS: "PENDING",
            },
            includeListIds: listIds,
            templateId: 1,
            redirectionUrl: "https://tstfie.ch/signup/success",
          }),
        }
      );
    } catch (err) {
      console.error("Brevo fetch failed:", err);
      return jsonError("brevo_fetch_error", 500);
    }

    if (!brevoRes.ok) {
      const text = await brevoRes.text();
      console.error("Brevo API failed:", brevoRes.status, text);
      return jsonError("brevo_failed", 500);
    }

    /* ================================
       Success
    ================================= */
    return jsonSuccess();

  } catch (err) {
    console.error("Signup API unexpected error:", err);
    return jsonError("server_error", 500);
  }
};