import cartModel from "../models/cart.model.js"
import productModel from "../models/product.model.js"
import { stockOfVariant } from "../dao/product.dao.js"

export const cartController = async (req, res) => {
    try {
        const { productId, variantId } = req.params
        const { quantity = 1 } = req.body

        // Find product and validate it exists
        const product = await productModel.findOne({
            _id: productId,
            "variants._id": variantId
        })

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                success: false
            })
        }

        // Get stock for variant
        const stock = await stockOfVariant(productId, variantId)

        // Get or create cart for user
        let cart = await cartModel.findOne({ user: req.user._id })
        if (!cart) {
            cart = await cartModel.create({ user: req.user._id })
        }

        // Check if product already in cart
        const existingItem = cart.items.find(
            item => item.product.toString() === productId && item.variant?.toString() === variantId
        )

        if (existingItem) {
            // Product already in cart - update quantity
            const newQuantity = existingItem.quantity + quantity

            if (newQuantity > stock) {
                return res.status(400).json({
                    message: `Only ${stock - existingItem.quantity} item(s) left in stock. You already have ${existingItem.quantity} in your cart.`,
                    success: false
                })
            }

            // Update quantity
            await cartModel.findOneAndUpdate(
                { user: req.user._id, "items._id": existingItem._id },
                { $set: { "items.$.quantity": newQuantity } },
                { new: true }
            )
        } else {
            // Product not in cart - add new item
            if (quantity > stock) {
                return res.status(400).json({
                    message: `Only ${stock} item(s) available in stock.`,
                    success: false
                })
            }

            // Get the variant to fetch price
            const variant = product.variants.find(v => v._id.toString() === variantId)

            // Add item to cart
            await cartModel.findOneAndUpdate(
                { user: req.user._id },
                {
                    $push: {
                        items: {
                            product: productId,
                            variant: variantId,
                            quantity: quantity,
                            price: variant?.price?.amount ? {
                                amount: variant.price.amount,
                                currency: product.price.currency
                            } : product.price
                        }
                    }
                },
                { new: true }
            )
        }

        // Get updated cart
        const updatedCart = await cartModel.findOne({ user: req.user._id }).populate('items.product')

        return res.status(200).json({
            message: "Item added to cart successfully",
            success: true,
            cart: updatedCart
        })

    } catch (error) {
        console.error("Error in cartController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
}

export const getCartController = async (req, res) => {
    try {
        const cart = await cartModel.findOne({ user: req.user._id }).populate('items.product')
        
        if (!cart) {
            return res.status(200).json({
                message: "Cart is empty",
                success: true,
                items: []
            })
        }

        return res.status(200).json({
            message: "Cart fetched successfully",
            success: true,
            items: cart.items || []
        })
    } catch (error) {
        console.error("Error in getCartController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
}

export const updateCartItemController = async (req, res) => {
    try {
        const { itemId } = req.params
        const { quantity } = req.body

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be at least 1",
                success: false
            })
        }

        const cart = await cartModel.findOne({ user: req.user._id, "items._id": itemId })
        
        if (!cart) {
            return res.status(404).json({
                message: "Item not found in cart",
                success: false
            })
        }

        const item = cart.items.find(i => i._id.toString() === itemId)
        
        // Check stock before updating
        const stock = await stockOfVariant(item.product.toString(), item.variant.toString())
        if (quantity > stock) {
            return res.status(400).json({
                message: `Only ${stock} item(s) available in stock`,
                success: false
            })
        }

        await cartModel.findOneAndUpdate(
            { user: req.user._id, "items._id": itemId },
            { $set: { "items.$.quantity": quantity } },
            { new: true }
        )

        const updatedCart = await cartModel.findOne({ user: req.user._id }).populate('items.product')

        return res.status(200).json({
            message: "Item quantity updated successfully",
            success: true,
            items: updatedCart.items
        })
    } catch (error) {
        console.error("Error in updateCartItemController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
}

export const removeCartItemController = async (req, res) => {
    try {
        const { itemId } = req.params

        const cart = await cartModel.findOne({ user: req.user._id })
        
        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
                success: false
            })
        }

        await cartModel.findOneAndUpdate(
            { user: req.user._id },
            { $pull: { items: { _id: itemId } } },
            { new: true }
        )

        const updatedCart = await cartModel.findOne({ user: req.user._id }).populate('items.product')

        return res.status(200).json({
            message: "Item removed from cart successfully",
            success: true,
            items: updatedCart?.items || []
        })
    } catch (error) {
        console.error("Error in removeCartItemController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
}

export const clearCartController = async (req, res) => {
    try {
        await cartModel.findOneAndUpdate(
            { user: req.user._id },
            { $set: { items: [] } },
            { new: true }
        )

        return res.status(200).json({
            message: "Cart cleared successfully",
            success: true,
            items: []
        })
    } catch (error) {
        console.error("Error in clearCartController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
}