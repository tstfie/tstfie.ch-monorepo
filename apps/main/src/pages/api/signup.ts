export const prerender = false;
import type { APIRoute } from "astro";

/* ================================
   Helpers
================================= */

function jsonError(code: string, status = 400) {
  return new Response(
    JSON.stringify({ error: code }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

function jsonSuccess(data: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
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
      // Silent success to avoid bot feedback
      return jsonSuccess();
    }

    /* ================================
       Extract + sanitise fields
    ================================= */
    const email = String(formData.get("email") || "").trim();
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const message = String(formData.get("message") || "").trim();

    /* ================================
       Validation
    ================================= */
    if (!email) {
      return jsonError("email_required");
    }

    if (!email.includes("@") || email.length > 254) {
      return jsonError("invalid_email");
    }

    if (firstName.length > 100 || lastName.length > 100) {
      return jsonError("name_too_long");
    }

    if (message.length > 2000) {
      return jsonError("message_too_long");
    }

    /* ================================
       Interests → Brevo lists
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

    if (interests.length === 0) {
      return jsonError("no_interest");
    }

    const listIds = [
      ...new Set(interests.flatMap(i => LIST_MAP[i])),
    ];

    /* ================================
       Brevo request
    ================================= */

    // Ensure API key is available (fail fast with a clear error)
    if (!import.meta.env.BREVO_API_KEY) {
      console.error("BREVO_API_KEY is not set (signup)");
      return jsonError("brevo_key_missing", 500);
    }

    const brevoRes = await fetch(
      "https://api.brevo.com/v3/contacts/doubleOptinConfirmation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": import.meta.env.BREVO_API_KEY,
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

    if (!brevoRes.ok) {
      const text = await brevoRes.text();
      console.error("Brevo status:", brevoRes.status);
      console.error("Brevo body:", text);

      return jsonError("brevo_failed", 500);
    }

    /* ================================
       Success
    ================================= */
    return jsonSuccess();

  } catch (err) {
    console.error("Signup API error:", err);
    return jsonError("server_error", 500);
  }
};
