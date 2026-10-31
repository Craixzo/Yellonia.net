/* ==============================================================
   api/job.js - the link preview for one job listing

   Share a job as  https://yellonia.net/jobs/<id>  (vercel.json sends that here).
   Discord, and other apps that show link previews, read the tags below and
   show an embed with the job's details. People who open the link are sent
   straight on to the listing on jobs.html.

   /api/job?id=<id>           the page with the preview tags
   /api/job?id=<id>&oembed=1  extra details Discord shows above the title
   ============================================================== */

const { centurion } = require('../_lib/des');

/* ---------- SETTINGS ---------- */
const SITE_NAME = 'Yellonia Job Board';
const ICON      = '/images/TYEcoatofarms.png';   // the small picture on the right of the embed
const CACHE_SECONDS = 120;                        // how long a preview is reused before asking Centurion again

/* The colored bar down the left of the embed, by category */
const COLORS = {
  'Armed Forces': '#5bbf49',
  'Emergency Services': '#369cd3',
  'Government': '#bed215',
  'Corporations': '#e8a33d',
  'Media': '#d9534f',
  'Other': '#949ba4',
};
const ICONS = {           // the emoji in front of the category
  'Armed Forces': '🎖️',
  'Emergency Services': '🚨',
  'Government': '🏛️',
  'Corporations': '💼',
  'Media': '📰',
  'Other': '📌',
};


/* ---------- HELPERS ---------- */
const escape = (text) => String(text == null ? '' : text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Document text (## headings, - lists, **bold**) as plain lines; noHeadings leaves the headings out */
const plain = (text, noHeadings) => String(text || '')
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !(noHeadings && /^#{2,3}\s/.test(line)))
  .map((line) => line.replace(/^#{2,3}\s+/, '').replace(/^(-|\*)\s+/, '• ').replace(/^\d+\.\s+/, '• ').replace(/\*\*([^*]+)\*\*/g, '$1'));

const cut = (text, max) => (text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text);

const day = (value) => value
  ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  : '';

function origin(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'yellonia.net';
  return 'https://' + host;
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  const id = String((request.query && request.query.id) || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  const site = origin(request);
  const page = site + '/jobs.html' + (id ? '#job/' + id : '');

  const answer = id ? await centurion('/site/public/job', { id }) : { success: false };
  const job = answer && answer.success ? answer.listing : null;

  /* oEmbed: Discord shows author_name above the title and provider_name at the very top */
  if (request.query && request.query.oembed) {
    response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=600');
    return response.status(200).json({
      version: '1.0',
      type: 'link',
      provider_name: SITE_NAME,
      provider_url: site + '/jobs.html',
      author_name: job ? (ICONS[job.category] || '📌') + ' ' + job.organisation + ' · ' + job.category : 'Yellonia',
      author_url: site + '/jobs.html' + (job ? '?category=' + encodeURIComponent(job.category) : ''),
    });
  }

  let title, description, color;
  if (job) {
    const open = job.status === 'OPEN';
    title = (open ? '' : '[Closed] ') + job.title;   /* the organisation shows on the line above it */
    /* Most important first: Discord may cut long descriptions short (around 350 characters) */
    const lines = [];
    lines.push((open ? '🟢 Open' : '🔴 Closed') + (job.closesAt ? ' · closes ' + day(job.closesAt) : '') +
      (typeof job.applicants === 'number' ? ' · 👥 ' + job.applicants + (job.applicants === 1 ? ' applicant' : ' applicants') : ''));
    lines.push(cut(plain(job.description, true).join(' '), 160));
    const reqs = plain(job.requirements, true);
    if (reqs.length) {
      lines.push('');
      lines.push('Requirements');
      reqs.slice(0, 4).forEach((r) => lines.push(cut(r.charAt(0) === '•' ? r : '• ' + r, 70)));
      if (reqs.length > 4) lines.push('• and ' + (reqs.length - 4) + ' more');
    }
    lines.push('');
    lines.push(job.applyOnSite
      ? '➡️ Apply on the Yellonia job board'
      : '➡️ How to apply: ' + cut(plain(job.howToApply, true).join(' '), 120));
    lines.push('✍️ Posted by ' + job.postedName + ' · ' + day(job.createdAt));
    description = cut(lines.join('\n'), 700);
    color = COLORS[job.category] || '#bed215';
  } else {
    title = 'Yellonia Job Board';
    description = 'This listing is no longer available. See every open position in Yellonia on the job board.';
    color = '#bed215';
  }

  const self = site + '/jobs/' + id;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(title)} | Yellonia</title>
<meta name="description" content="${escape(description)}">
<meta name="theme-color" content="${escape(color)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escape(SITE_NAME)}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(self)}">
<meta property="og:image" content="${escape(site + ICON)}">
<meta name="twitter:card" content="summary">
<link type="application/json+oembed" href="${escape(site + '/api/job?oembed=1&id=' + encodeURIComponent(id))}">
<meta http-equiv="refresh" content="0; url=${escape(page)}">
<link rel="canonical" href="${escape(self)}">
</head>
<body>
<p><a href="${escape(page)}">Open this job on the Yellonia job board</a></p>
<script>location.replace(${JSON.stringify(page)});</script>
</body>
</html>`;

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=600');
  return response.status(200).send(html);
};
