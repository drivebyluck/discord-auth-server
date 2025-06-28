const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
require('dotenv').config();

const app = express();

app.use(session({
  secret: 'supersecret',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/discord/callback',
  scope: ['identify', 'guilds', 'guilds.members.read'],
}, (accessToken, refreshToken, profile, done) => {
  process.nextTick(() => done(null, profile));
}));

// Middleware to check login
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/discord');
}

// Middleware to check for TradeWithJars role in specified server
const fetch = require('node-fetch'); // make sure this is at the top if not already

async function ensureHasRole(req, res, next) {
  if (!req.user || !req.user.id) return res.redirect('/auth/discord');

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${req.user.id}`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`,
      },
    });

    if (!response.ok) return res.status(403).send('Access denied.');

    const member = await response.json();
    const hasRole = member.roles.includes(process.env.ROLE_ID); // ROLE_ID = TradeWithJars role

    if (hasRole) return next();
    else return res.status(403).send('Access denied: You must have the TradeWithJars role.');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal server error.');
  }
}


// Static files
app.use(express.static(path.join(__dirname)));

// Discord auth
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// Role check endpoint (optional for frontend use)
app.get('/check-role', (req, res) => {
  if (!req.user) return res.status(401).json({ authorized: false });
  const hasRole = req.user.guilds?.some(g => g.id === process.env.GUILD_ID);
  if (hasRole) {
    res.json({ authorized: true, username: req.user.username });
  } else {
    res.json({ authorized: false });
  }
});

// Serve calculator ONLY if authenticated + has role
app.get('/', ensureAuthenticated, ensureHasRole, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/leverage_calculator.html'));
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
