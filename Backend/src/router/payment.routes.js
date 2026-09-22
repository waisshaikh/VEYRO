import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
    verifyPaymentController,
    getPaymentByIdController,
    getUserPaymentsController,
    createPendingPaymentController,
    getPaymentByOrderIdController
} from "../controllers/payment.controller.js";

const router = express.Router();

// Create pending payment on checkout click
router.post("/create", authenticateUser, createPendingPaymentController);

// Update payment status after Razorpay success/failure
router.post("/verify", authenticateUser, verifyPaymentController);

// Get payment by MongoDB ID
router.get("/:id", authenticateUser, getPaymentByIdController);

// Get payment by Razorpay orderId
router.get("/order/:orderId", authenticateUser, getPaymentByOrderIdController);

// Get all payments for a user
router.get("/", authenticateUser, getUserPaymentsController);

export default router;
