/* api/auth/logout.js - logs the visitor out and returns them to the news page. */
const { clearSession, redirect } = require('../_lib/session');

module.exports = (request, response) => {
  clearSession(response);
  redirect(response, '/news.html');
};
