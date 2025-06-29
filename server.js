require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const axios = require('axios');
const path = require('path');

const app = express();

// Serve static files (if you have any) from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ['identify', 'guilds', 'guilds.members.read']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const userId = profile.id;
    const guildId = process.env.GUILD_ID;
    const botToken = process.env.BOT_TOKEN;

    const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    const member = response.data;
    const roles = member.roles;

    console.log("Fetched user ID:", userId);
    console.log("Roles in guild:", roles);
    console.log("Required role:", process.env.REQUIRED_ROLE);

    if (roles.includes(process.env.REQUIRED_ROLE)) {
      return done(null, profile);
    } else {
      console.log("Role not found.");
      return done(null, false, { message: 'Unauthorized' });
    }
  } catch (error) {
    console.error("Error verifying user role:", error.response?.data || error.message);
    return done(null, false, { message: 'Unauthorized' });
  }
}));

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/unauthorized' }),
  (req, res) => {
    req.session.isAuthorized = true;
    res.redirect('https://tradewithjars.net/gate.html'); // ⬅️ Redirect to live domain
  }
);

app.get('/unauthorized', (req, res) => {
  res.send('Unauthorized');
});

app.listen(10000, () => console.log('Server running on port 10000'));
