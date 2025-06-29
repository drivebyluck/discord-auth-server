require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Ensure secret is pulled from .env
if (!process.env.SECRET) {
  throw new Error("SECRET is not defined in environment variables.");
}

app.use(cors());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

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
      callbackURL: process.env.CALLBACK_URL,
      scope: ['identify', 'guilds', 'guilds.members.read'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const response = await fetch(
          `https://discord.com/api/v10/users/@me/guilds/${process.env.GUILD_ID}/member`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          return done(null, false, { message: 'Failed to fetch user guild data' });
        }

        const member = await response.json();

        if (
          member.roles &&
          member.roles.includes(process.env.REQUIRED_ROLE)
        ) {
          return done(null, profile);
        } else {
          return done(null, false, { message: 'User does not have the required role' });
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/gate.html?error=role',
  }),
  (req, res) => {
    res.redirect('/leverage_calculator.html');
  }
);

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/gate.html');
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
