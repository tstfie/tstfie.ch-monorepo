import type { APIRoute } from 'astro';

/* ================================
   Config
================================ */

const BREVO_API_KEY = import.meta.env.BREVO_API_KEY;
const TO_EMAIL = 'info@tstfie.ch';
const FROM_EMAIL = 'no-reply@tstfie.ch';
const ALLOWED_ORIGIN = 'https://www.tstfie.ch';

const LIMITS = {
  name: 80,
  email: 120,
  message: 2000,
};

const RATE_LIMIT = {
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
};

/* ================================
   Simple in-memory rate limiter
   (for low-volume, serverless)
================================ */

const rateStore = new Map<string, { count: number; ts: number }>();

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || now - entry.ts > RATE_LIMIT.windowMs) {
    rateStore.set(key, { count: 1, ts: now });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT.maxRequests;
}

/* ================================
   Helpers
================================ */

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]!)
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* ================================
   POST handler
================================ */

export const POST: APIRoute = async ({ request }) => {
  try {
    /* ---- Origin check ---- */
    const origin = request.headers.get('origin');
    if (origin !== ALLOWED_ORIGIN) {
      return jsonError('Forbidden', 403);
    }

    /* ---- Size guard ---- */
    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > 10_000) {
      return jsonError('Payload too large', 413);
    }

    const body = await request.json();
    const { name, lastName, email, message, website } = body;

    /* ---- Honeypot ---- */
    if (website) {
      return jsonError('Spam detected', 400);
    }

    /* ---- Required fields ---- */
    if (!name || !email || !message) {
      return jsonError('Missing required fields');
    }

    /* ---- Length limits ---- */
    if (
      name.length > LIMITS.name ||
      email.length > LIMITS.email ||
      message.length > LIMITS.message
    ) {
      return jsonError('Input exceeds allowed length');
    }

    /* ---- Email validation ---- */
    if (!isValidEmail(email)) {
      return jsonError('Invalid email address');
    }

    /* ---- Rate limiting ---- */
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      'unknown';

    if (isRateLimited(`ip:${ip}`) || isRateLimited(`email:${email}`)) {
      return jsonError('Too many requests', 429);
    }

    /* ---- Sanitisation ---- */
    const senderName = escapeHtml(
      lastName ? `${name} ${lastName}` : name
    );
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    /* ---- Email payload ---- */
    const payload = {
      sender: { name: 'tstfie', email: FROM_EMAIL },
      to: [{ email: TO_EMAIL, name: 'tstfie' }],
      subject: `Message from ${senderName}`,
      htmlContent: `
        <p><strong>From:</strong> ${senderName}<br/><strong>At:</strong> ${safeEmail}</p>
        <p>${safeMessage.replace(/\n/g, '<br>')}</p>
      `,
      textContent: `
Name: ${senderName}
Reply to: ${email}

${message}
      `.trim(),
      replyTo: { email, name: senderName },
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Do NOT leak Brevo internals
      console.error('Brevo error:', await res.text());
      return jsonError('Email service error', 502);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contact API error:', err);
    return jsonError('Internal server error', 500);
  }
};