const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const fetch = require("node-fetch"); // Ensure node-fetch is installed
const path = require("path");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || "https://www.tradewithjars.net/callback";
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE = process.env.REQUIRED_ROLE; // Use Role ID, not name

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: CALLBACK_URL,
  scope: ['identify', 'guilds', 'guilds.members.read']
},
async (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;
  return done(null, profile);
}));

app.use(session({
  secret: 'some_random_secret_key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/auth/discord");
}

async function ensureHasRole(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/auth/discord");

  const userId = req.user.id;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    if (!response.ok) throw new Error("Failed to fetch member info");

    const data = await response.json();
    const hasRole = data.roles.includes(REQUIRED_ROLE);

    if (hasRole) return next();
    return res.status(403).send("Access denied: you do not have the required role.");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error while verifying role.");
  }
}

app.get("/auth/discord", passport.authenticate("discord"));
app.get("/callback",
  passport.authenticate("discord", {
    failureRedirect: "/unauthorized"
  }),
  (req, res) => {
    res.redirect("https://www.tradewithjars.net/leverage_calculator.html");
  }
);

app.get("/unauthorized", (req, res) => {
  res.status(403).send("Access denied.");
});

app.use("/", checkAuth, ensureHasRole, express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
