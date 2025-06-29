const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ['identify', 'guilds', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
  process.nextTick(() => done(null, profile));
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/unauthorized' }), async (req, res) => {
  try {
    const guild = req.user.guilds.find(g => g.id === process.env.GUILD_ID);
    if (!guild) {
      return res.redirect('/unauthorized');
    }

    const response = await fetch(`https://discord.com/api/v9/guilds/${process.env.GUILD_ID}/members/${req.user.id}`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    const data = await response.json();
    const hasRole = data.roles.includes(process.env.REQUIRED_ROLE);

    if (hasRole) {
      return res.redirect('https://tradewithjars.net/leverage_calculator.html');
    } else {
      return res.redirect('/unauthorized');
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.redirect('/unauthorized');
  }
});

app.get('/unauthorized', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Access Denied</title>
        <style>
          body {
            background-color: black;
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          a {
            color: #00bfff;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>You do not have the required role to access this tool.</h1>
        <p>Please <a href="https://discord.gg/bbBPzjJk" target="_blank">join the Doughboi's Bakery Discord</a> and request the <strong>TradeWithJars</strong> role.</p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
