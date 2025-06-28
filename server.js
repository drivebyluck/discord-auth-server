const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
require('dotenv').config();

const app = express();

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      discordcallbackURL: 'https://discord-auth-server-ajjz.onrender.com/auth/discord/callback',
      scope: ['identify', 'guilds', 'guilds.members.read'],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

// Route to start Discord login
app.get('/auth/discord', passport.authenticate('discord'));

// Callback after Discord login
app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    const userGuilds = req.user.guilds;
    const targetGuildId = process.env.GUILD_ID;
    const requiredRoleId = '1388631579252887697';

    const inGuild = userGuilds.find(guild => guild.id === targetGuildId);
    if (!inGuild) return res.send('You must be in the Discord server.');

    // This part requires actual member data from the bot if deeper validation is needed

    res.redirect('/leverage_calculator.html');
  }
);

// Route to check if user is authenticated
app.get('/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
