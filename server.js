require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({
  origin: ["https://tradewithjars.net"],
  credentials: true
}));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ["identify", "guilds", "guilds.members.read"],
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => done(null, profile));
    }
  )
);

// Serve static files (like gate.html and leverage_calculator.html if needed)
app.use(express.static(path.join(__dirname, "public")));

app.get("/auth/discord", passport.authenticate("discord"));

app.get("/auth/discord/callback", passport.authenticate("discord", { failureRedirect: "/gate.html" }), async (req, res) => {
  try {
    const userId = req.user.id;
    const guildId = process.env.GUILD_ID;
    const roleId = process.env.ROLE_ID;
    const botToken = process.env.BOT_TOKEN;

    const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    const member = response.data;
    const roles = member.roles;

    if (roles.includes(roleId)) {
      console.log(`✅ User ${userId} authorized, redirecting to calculator`);
      res.redirect("https://tradewithjars.net/leverage_calculator.html");
    } else {
      console.log(`⛔ User ${userId} missing required role`);
      res.redirect("https://tradewithjars.net/gate.html");
    }
  } catch (error) {
    console.error("❌ Error checking roles:", error.message);
    res.redirect("https://tradewithjars.net/gate.html");
  }
});

app.get("/check-auth", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
