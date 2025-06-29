
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const qs = require('querystring');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;

app.use(session({
  secret: 'very_secure_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000,
    secure: false
  }
}));

app.get('/auth/discord', async (req, res) => {
  if (req.session.user) {
    return res.redirect('/success');
  }
  const authorizeUrl = \`https://discord.com/api/oauth2/authorize?client_id=\${CLIENT_ID}&redirect_uri=\${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20guilds.members.read\`;
  res.redirect(authorizeUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code provided');

  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        scope: 'identify guilds guilds.members.read'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: \`Bearer \${access_token}\` }
    });

    const user = userRes.data;

    const memberRes = await axios.get(\`https://discord.com/api/users/@me/guilds/\${GUILD_ID}/member\`, {
      headers: { Authorization: \`Bearer \${access_token}\` }
    });

    const member = memberRes.data;
    const hasRole = member.roles.includes(REQUIRED_ROLE_ID);

    if (!hasRole) return res.send('Access denied: missing required role');

    req.session.user = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      roles: member.roles
    };

    res.redirect('/success');
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send('Access denied.');
  }
});

app.get('/success', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/discord');
  res.sendFile(__dirname + '/leverage_calculator.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
