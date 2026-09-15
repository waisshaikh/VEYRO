import express from "express";
import morgan from "morgan";
import cookieparser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import authRouter from "./router/auth.router.js";
import productRouter from "./router/product.routes.js"
import cartRouter from "./router/cart.routes.js"
import {config} from "./config/config.js";
import Usermodel from "./models/user.model.js";
import { googleAuthController } from "./controllers/auth.controller.js";

const app = express();

// CORS must be first
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieparser());
app.use(passport.initialize());

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.Client_ID,
      clientSecret: config.Client_secret,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await Usermodel.findOne({ googleId: profile.id });

        if (!user) {
          // Try to find by email in case they registered manually
          user = await Usermodel.findOne({
            email: profile.emails?.[0]?.value,
          });

          if (user) {
            // Link Google ID to existing account
            user.googleId = profile.id;
            await user.save();
          } else {
            // Create new user from Google profile
            user = await Usermodel.create({
              googleId: profile.id,
              email: profile.emails?.[0]?.value,
              fullname: profile.displayName,
              contact: "",
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

// Google OAuth routes (must match Google Cloud Console redirect URI exactly)

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/register?error=google_failed",
  }),
  googleAuthController
);

app.use("/api/auth", authRouter);
app.use("/api/products",productRouter);
app.use("/api/cart", cartRouter);

export default app;
