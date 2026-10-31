/* ==============================================================
   api/[route].js - every /api/... address on the site, in one function

   Vercel's free (Hobby) plan allows at most 12 serverless functions per
   deployment. Instead of one function per file, this single file answers
   /api/des, /api/news, /api/wanted and the rest, and hands each request
   to the matching file in api/_routes/. (Folders starting with "_" are
   not functions themselves.) The addresses the pages use don't change.

   TO ADD A NEW ADDRESS, e.g. /api/example:
     1. put the code in api/_routes/example.js (module.exports = async (request, response) => { ... })
     2. add a line for it to ROUTES below
   ============================================================== */

const ROUTES = {
  apply:       require('./_routes/apply'),
  des:         require('./_routes/des'),
  economy:     require('./_routes/economy'),
  government:  require('./_routes/government'),
  legislation: require('./_routes/legislation'),
  news:        require('./_routes/news'),
  newsroom:    require('./_routes/newsroom'),
  parliament:  require('./_routes/parliament'),
  report:      require('./_routes/report'),
  site:        require('./_routes/site'),
  stats:       require('./_routes/stats'),
  wanted:      require('./_routes/wanted'),
};

module.exports = async (request, response) => {
  const name = String((request.query && request.query.route) || '');
  const handler = Object.prototype.hasOwnProperty.call(ROUTES, name) ? ROUTES[name] : null;
  if (!handler) return response.status(404).json({ success: false, msg: 'Not found.' });
  if (request.query) delete request.query.route;   /* the pages' own ?query values are left as they were */
  return handler(request, response);
};
