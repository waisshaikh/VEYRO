import express from "express";
import { authenticateSeller } from "../middlewares/auth.middleware.js"
import multer from "multer"
import {
    createProduct,
    getSellerProduct,
    getAllProduct,
    getProductDetail,
    addVariant,
    updateVariantStock,
    updateVariant,
    deleteVariant
} from "../controllers/product.controller.js"
import { productValidator } from "../validator/product.validator.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024  //5 MB
    }
})

const router = express.Router();

router.post("/", authenticateSeller, upload.array('images', 7), productValidator, createProduct)

router.get("/seller", authenticateSeller, getSellerProduct)

// Seller variant endpoints
router.post("/seller/product/:productId/variants", authenticateSeller, upload.array('images', 7), addVariant);
router.patch("/seller/product/:productId/variants/:variantId/stock", authenticateSeller, updateVariantStock);
router.put("/seller/product/:productId/variants/:variantId", authenticateSeller, upload.array('images', 7), updateVariant);
router.delete("/seller/product/:productId/variants/:variantId", authenticateSeller, deleteVariant);



// display All product for user 
router.get("/", getAllProduct);

router.get("/product/:id", getProductDetail)

export default router


