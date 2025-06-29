const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(
  session({
    secret: process.env.SECRET || "secret-session-key",
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
    async (accessToken, refreshToken, profile, done) => {
      try {
        const guildId = process.env.GUILD_ID;
        const userId = profile.id;

        const response = await axios.get(
          `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
          {
            headers: {
              Authorization: `Bot ${process.env.BOT_TOKEN}`,
            },
          }
        );

        const member = response.data;
        const requiredRole = process.env.REQUIRED_ROLE;
        const hasRole = member.roles.includes(requiredRole);

        if (!hasRole) {
          return done(null, false, { message: "Missing required role" });
        }

        return done(null, profile);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.get("/auth/discord", passport.authenticate("discord"));
app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "/unauthorized",
    session: true,
  }),
  (req, res) => {
    res.redirect("https://tradewithjars.net/leverage_calculator.html"); // ✅ Replace with your protected frontend URL
  }
);

app.get("/unauthorized", (req, res) => {
  res.status(403).send("Access Denied: You do not have the required role.");
});

// ✅ Root route for Render health check and browser confirmation
app.get("/", (req, res) => {
  res.send("Discord Auth Server is running.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
