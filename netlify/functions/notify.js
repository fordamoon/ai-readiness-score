exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (_) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, email, score, industry } = data;
  if (!name || !email || score === undefined) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const industryLabels = {
    'tourism':               'Tourism / Hospitality / Outdoor',
    'home-services':         'Home Services',
    'food-beverage':         'Food & Beverage / Restaurant',
    'retail':                'Retail',
    'health-wellness':       'Health & Wellness',
    'professional-services': 'Professional Services',
    'construction':          'Construction / Trades',
    'real-estate':           'Real Estate',
    'other':                 'Other'
  };
  const industryLabel = industryLabels[industry] || industry;

  const CALENDLY_URL       = 'https://calendly.com/matthewalighieri';
  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM        = process.env.TWILIO_FROM_NUMBER;
  const MATTHEW_PHONE      = process.env.MATTHEW_PHONE;

  const errors = [];

  // ── Email via Resend ─────────────────────────────────────────────────────────
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'AI Readiness Score <onboarding@resend.dev>',
          to: 'matthewalighieri@gmail.com',
          subject: `Priority lead — ${name} scored ${score}/100`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1E293B;">
              <div style="background:#0F2340;padding:24px 28px;border-radius:12px 12px 0 0;">
                <p style="color:#00B896;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">Priority Lead</p>
                <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em;">
                  ${name} scored ${score}/100
                </h1>
              </div>
              <div style="background:#fff;padding:28px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:13px;width:120px;">Name</td>
                    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-weight:600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:13px;">Email</td>
                    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;">
                      <a href="mailto:${email}" style="color:#0F2340;font-weight:600;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:13px;">Score</td>
                    <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:22px;font-weight:800;color:#00B896;">${score} / 100</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;color:#64748B;font-size:13px;">Industry</td>
                    <td style="padding:10px 0;font-weight:500;">${industryLabel}</td>
                  </tr>
                </table>
                <div style="margin-top:24px;">
                  <a href="${CALENDLY_URL}"
                     style="display:inline-block;padding:13px 24px;background:#0F2340;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                    Book Their Call →
                  </a>
                </div>
                <p style="color:#94A3B8;font-size:11px;margin-top:20px;">AI Readiness Score · Lakes Region Growth Studio</p>
              </div>
            </div>
          `
        })
      });
      if (!res.ok) errors.push('email:' + await res.text());
    } catch (e) {
      errors.push('email:' + e.message);
    }
  }

  // ── SMS via Twilio ───────────────────────────────────────────────────────────
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM && MATTHEW_PHONE) {
    try {
      const body = `Priority lead: ${name} scored ${score}/100 (${industryLabel}). Email: ${email}. Book: ${CALENDLY_URL}`;
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const res  = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ To: MATTHEW_PHONE, From: TWILIO_FROM, Body: body }).toString()
        }
      );
      if (!res.ok) errors.push('sms:' + await res.text());
    } catch (e) {
      errors.push('sms:' + e.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, errors })
  };
};
