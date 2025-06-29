const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const cors = require("cors");

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new DiscordStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ["identify", "guilds", "guilds.members.read"],
      state: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          console.error("Failed to fetch guild member");
          return done(null, false);
        }

        const data = await response.json();
        const roles = data.roles;
        profile.guildRoles = roles;
        return done(null, profile);
      } catch (error) {
        console.error("Error fetching user guild info:", error);
        return done(error);
      }
    }
  )
);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/auth/discord",
  (req, res, next) => {
    req.session.redirectTo = req.query.state || "https://tradewithjars.net/leverage_calculator.html";
    next();
  },
  passport.authenticate("discord")
);

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "https://tradewithjars.net/gate.html" }),
  (req, res) => {
    const roles = req.user.guildRoles || [];
    const hasRole = roles.includes(REQUIRED_ROLE_ID);
    const redirectUrl = req.session.redirectTo || "https://tradewithjars.net/leverage_calculator.html";
    res.redirect(hasRole ? redirectUrl : "https://tradewithjars.net/gate.html");
  }
);

app.get("/check-auth", (req, res) => {
  if (req.isAuthenticated() && req.user.guildRoles.includes(REQUIRED_ROLE_ID)) {
    return res.sendStatus(200);
  } else {
    return res.sendStatus(401);
  }
});

app.listen(10000, () => {
  console.log("Server running on port 10000");
});
