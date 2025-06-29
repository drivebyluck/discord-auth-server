const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Allow CORS
app.use(cors());

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ["identify", "guilds", "guilds.members.read"],
    },
    function (accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Auth route
app.get("/auth/discord", passport.authenticate("discord"));

// Callback handler
app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "https://tradewithjars.net/gate.html?error=access_denied",
  }),
  (req, res) => {
    const user = req.user;
    const guild = user.guilds.find((g) => g.id === process.env.GUILD_ID);

    if (!guild || !guild.roles.includes(process.env.REQUIRED_ROLE_ID)) {
      return res.redirect("https://tradewithjars.net/gate.html?error=access_denied");
    }

    return res.redirect("https://tradewithjars.net/leverage_calculator.html");
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
