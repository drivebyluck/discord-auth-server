require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fetch = require('node-fetch');

const app = express();

// Passport config
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'guilds', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
  process.nextTick(() => done(null, profile));
}));

// Express sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Auth middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/discord');
}

async function ensureHasRole(req, res, next) {
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${req.user.id}`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`,
      }
    });

    if (!response.ok) return res.status(403).send('Access denied (not in guild)');
    const member = await response.json();
    const hasRole = member.roles.includes(process.env.ROLE_ID);

    if (hasRole) return next();
    else return res.status(403).send('Access denied: Missing required role.');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}

// Routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/leverage_calculator.html');
});

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Serve calculator ONLY if authenticated + has role
app.get('/leverage_calculator.html', ensureAuthenticated, ensureHasRole, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/leverage_calculator.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
