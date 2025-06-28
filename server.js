require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fetch = require('node-fetch');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();

app.use(
  session({
    secret: 'supersecret',
    resave: false,
    saveUninitialized: false,
  })
);

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

app.use(passport.initialize());
app.use(passport.session());

function ensureHasRole(req, res, next) {
  if (!req.user) {
    return res.redirect('/');
  }

  const hasRole = req.user.guilds.some((g) => g.id === process.env.GUILD_ID);

  if (hasRole) {
    next();
  } else {
    res.sendFile(path.join(__dirname, 'public', 'unauthorized.html'));
  }
}

app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/check-role', (req, res) => {
  if (!req.user) return res.status(401).json({ authorized: false });

  const hasRole = req.user.guilds.some((g) => g.id === process.env.GUILD_ID);
  if (hasRole) {
    res.json({ authorized: true, username: req.user.username });
  } else {
    res.json({ authorized: false });
  }
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
