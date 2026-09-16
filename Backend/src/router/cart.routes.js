import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { 
    cartController, 
    getCartController, 
    updateCartItemController, 
    removeCartItemController, 
    clearCartController 
} from "../controllers/cart.controller.js"
import { validateAddToCart } from "../validator/Cart.validator.js"

const router = express.Router();

// Get cart
router.get("/", authenticateUser, getCartController);

// Clear entire cart (must come before /:itemId routes)
router.delete("/", authenticateUser, clearCartController);

// Add to cart (supports both main product and variant)
router.post("/:productId", authenticateUser, validateAddToCart, cartController);
router.post("/:productId/:variantId", authenticateUser, validateAddToCart, cartController);

// Update cart item quantity
router.patch("/:itemId", authenticateUser, updateCartItemController);

// Remove cart item
router.delete("/:itemId", authenticateUser, removeCartItemController);

export default router