require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const fetch = require("node-fetch");

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE = process.env.REQUIRED_ROLE;
const BOT_TOKEN = process.env.BOT_TOKEN;

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy(
  {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ["identify", "guilds", "guilds.members.read"]
  },
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
  }
));

app.use(session({
  secret: "secret-session-key",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/auth/discord");
  }
}

async function hasRequiredRole(userId) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch member data: ${response.status}`);
    return false;
  }

  const member = await response.json();
  return member.roles.includes(REQUIRED_ROLE);
}

app.get("/auth/discord", passport.authenticate("discord"));

app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/unauthorized" }),
  async (req, res) => {
    const userId = req.user.id;
    const allowed = await hasRequiredRole(userId);

    if (allowed) {
      res.redirect("https://www.tradewithjars.net/leverage_calculator.html");
    } else {
      req.logout(() => {
        res.redirect("/unauthorized");
      });
    }
  }
);

app.get("/unauthorized", (req, res) => {
  res.status(403).send("Access Denied: You do not have the required role.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
