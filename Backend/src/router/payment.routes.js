import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
    verifyPaymentController,
    getPaymentByIdController,
    getUserPaymentsController,
    createPendingPaymentController
} from "../controllers/payment.controller.js";

const router = express.Router();

// Create pending payment on checkout click
router.post("/create", authenticateUser, createPendingPaymentController);

// Update payment status after Razorpay success/failure
router.post("/verify", authenticateUser, verifyPaymentController);

// Get payment by ID
router.get("/:id", authenticateUser, getPaymentByIdController);

// Get all payments for a user
router.get("/", authenticateUser, getUserPaymentsController);

export default router;
