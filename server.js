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
    saveUninitialized: false,
  })
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ['identify', 'guilds', 'guilds.members.read'],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureHasRole(req, res, next) {
  if (!req.user || !req.user.id) return res.redirect('/auth/discord');

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${req.user.id}`,
      {
        heade
