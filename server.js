require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const axios = require("axios");
const path = require("path");

const app = express();

app.use(
  session({
    secret: "verysecret",
    resave: false,
    saveUninitialized: false
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
      scope: ["identify", "guilds", "guilds.members.read"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const response = await axios.get(
          `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${profile.id}`,
          {
            headers: {
              Authorization: `Bot ${process.env.BOT_TOKEN}`
            }
          }
        );

        const roles = response.data.roles;
        if (roles.includes(process.env.REQUIRED_ROLE_ID)) {
          return done(null, profile);
        } else {
          return done(null, false);
        }
      } catch (err) {
        console.error("Error verifying user role:", err);
        return done(err, null);
      }
    }
  )
);

app.get(
  "/auth/discord",
  passport.authenticate("discord")
);

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "/unauthorized.html"
  }),
  (req, res) => {
    res.redirect("/gate.html");
  }
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.redirect("/gate.html");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
