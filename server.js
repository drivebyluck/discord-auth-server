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
    secret: 'superssecret',
    resave: false,
    saveUninitialized: false
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
      scope: ['identify', 'guilds', 'guilds.members.read']
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

app.use(passport.initialize());
app.use(passport.session());

async function ensureHasRole(req, res, next) {
  if (!req.user || !req.user.id) return res.redirect('/auth/discord');

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${req.user.id}`,
      {
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`
        }
      }
    );

    if (!response.ok) return res.status(403).send('Access denied.');

    const member = await response.json();
    const hasRole = member.roles.includes(process.env.ROLE_ID);

    if (hasRole) {
      return next();
    } else {
      return res.status(403).send('Missing role.');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Error verifying role.');
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { fa
