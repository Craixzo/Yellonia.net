/* api/auth/me.js - tells a page who is logged in: { user: { id, name, username, avatar } } or { user: null } */
const { getSession } = require('../../_lib/session');

module.exports = (request, response) => {
  const user = getSession(request);
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    user: user ? {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar ? 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png?size=64' : null,
    } : null,
  });
};
