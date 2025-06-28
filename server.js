require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const fetch = require('node-fetch');
const path = require('path');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ['identify', 'guilds'],
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => done(null, profile));
    }
  )
);

function ensureHasRole(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/auth/discord');

  fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${req.user.id}`, {
    headers: {
      Authorization: `Bot ${process.env.BOT_TOKEN}`,
    },
  })
    .then(res => res.json())
    .then(member => {
      const hasRole = member.roles?.includes(process.env.ROLE_ID);
      if (hasRole) return next();
      return res.status(403).send('Access denied.');
    })
    .catch(err => {
      console.error('Role check failed:', err);
      return res.status(500).send('Internal server error.');
    });
}

app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/check-auth', (req, res) => {
  res.json({ authorized: !!req.user });
});

app.get('/', ensureHasRole, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/leverage_calculator.html'));
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server started on port', process.env.PORT || 3000);
});
