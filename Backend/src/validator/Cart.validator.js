import { param, body, validationResult } from "express-validator"

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()})
    }
    next()
}

export const validateAddToCart = [
    param('productId').isMongoId().withMessage("invalid Product Id"),
    param('variantId').optional().custom((val) => {
        if (!val || val === "main" || val === "undefined" || val === "null" || /^[0-9a-fA-F]{24}$/.test(val)) {
            return true;
        }
        throw new Error("invalid Variant Id");
    }),
    body("quantity").optional().isInt({min:1}).withMessage("quantity Must be at least 1"),
    validateRequest
]


