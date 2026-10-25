/* ==============================================================
   api/auth/[action].js - the Discord login addresses, in one function

   Answers /api/auth/login, /api/auth/callback, /api/auth/logout and
   /api/auth/me (see api/[route].js for why they're grouped). The code
   for each is in api/_routes/auth/. The callback address registered
   with Discord stays /api/auth/callback.
   ============================================================== */

const ACTIONS = {
  callback: require('../_routes/auth/callback'),
  login:    require('../_routes/auth/login'),
  logout:   require('../_routes/auth/logout'),
  me:       require('../_routes/auth/me'),
};

module.exports = async (request, response) => {
  const name = String((request.query && request.query.action) || '');
  const handler = Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : null;
  if (!handler) return response.status(404).json({ success: false, msg: 'Not found.' });
  if (request.query) delete request.query.action;
  return handler(request, response);
};
