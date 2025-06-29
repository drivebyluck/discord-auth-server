require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");

const app = express();

// Load ENV variables
const {
  CLIENT_ID,
  CLIENT_SECRET,
  CALLBACK_URL,
  GUILD_ID,
  REQUIRED_ROLE,
  BOT_TOKEN,
  SECRET
} = process.env;

// Session configuration
app.use(session({
  secret: SECRET || "secret-session-key",
  resave: false,
  saveUninitialized: false
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Discord strategy
passport.use(new DiscordStrategy(
  {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ["identify", "guilds", "guilds.members.read"]
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${profile.id}`,
        {
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`
          }
        }
      );

      const member = response.data;
      const hasRole = member.roles.includes(REQUIRED_ROLE);

      if (!hasRole) {
        return done(null, false, { message: "Missing required role" });
      }

      return done(null, profile);
    } catch (error) {
      console.error("Failed to check role:", error.response?.data || error.message);
      return done(error);
    }
  }
));

// OAuth2 routes
app.get("/auth/discord", passport.authenticate("discord"));

app.get("/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "/unauthorized",
    session: true
  }),
  (req, res) => {
    res.redirect("https://tradewithjars.net/leverage_calculator.html");
  }
);

// Unauthorized response
app.get("/unauthorized", (req, res) => {
  res.status(403).send("Access Denied: You do not have the required role.");
});

// Health check route
app.get("/", (req, res) => {
  res.send("Discord Auth Server is running.");
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
