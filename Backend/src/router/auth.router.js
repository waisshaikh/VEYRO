import { Router } from "express";
import passport from "passport";
import { registerValidationUser, loginValidation } from "../validator/auth.validation.js";
import { regiterController, loginController, googleAuthController, meController, logoutController } from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { config } from "../config/config.js";

const router = Router();

router.post('/register', registerValidationUser, regiterController);
router.post('/login', loginValidation, loginController);
router.post('/logout', logoutController);
router.get('/logout', logoutController);

// Google OAuth — redirect to Google login page
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Google OAuth — callback after user grants permission
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${config.FRONTEND_ORIGIN}/register?error=google_failed` }),
    googleAuthController
);

router.get('/me', authenticateUser, meController)

export default router;
