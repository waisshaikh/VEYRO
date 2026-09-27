import express from "express";
import { authenticateUser, authenticateSeller } from "../middlewares/auth.middleware.js";
import {
    verifyPaymentController,
    getPaymentByIdController,
    getUserPaymentsController,
    createPendingPaymentController,
    getPaymentByOrderIdController,
    getSellerOrdersController,
    updateSellerOrderStatusController
} from "../controllers/payment.controller.js";

const router = express.Router();

// Seller order routes (accessible ONLY by sellers for products they own)
router.get("/seller/orders", authenticateSeller, getSellerOrdersController);
router.patch("/seller/orders/status", authenticateSeller, updateSellerOrderStatusController);

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

