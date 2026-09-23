import express from "express";
import morgan from "morgan";
import cookieparser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import authRouter from "./router/auth.router.js";
import productRouter from "./router/product.routes.js"
import cartRouter from "./router/cart.routes.js"
import paymentRouter from "./router/payment.routes.js"
import {config} from "./config/config.js";
import Usermodel from "./models/user.model.js";
import { googleAuthController } from "./controllers/auth.controller.js";

const app = express();

// CORS must be first
const allowedOrigins = [
  config.FRONTEND_ORIGIN,
  config.BACKEND_ORIGIN,
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any localhost port (dev)
    if (origin.startsWith("http://localhost:")) return callback(null, true);
    // Allow any Vercel preview deployment for this project
    if (origin.endsWith(".vercel.app") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
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
      callbackURL: `${config.BACKEND_ORIGIN}/api/auth/google/callback`,
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

// Google OAuth routes are handled by authRouter under /api/auth

app.use("/api/auth", authRouter);
app.use("/api/products",productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/payment", paymentRouter);

export default app;
