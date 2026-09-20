import cartModel from "../models/cart.model.js"
import productModel from "../models/product.model.js"
import { stockOfVariant } from "../dao/product.dao.js"

export const cartController = async (req, res) => {
    try {
        const { productId, variantId } = req.params
        const { quantity = 1 } = req.body

        const isVariant = Boolean(
            variantId && 
            variantId !== "undefined" && 
            variantId !== "null" && 
            variantId !== "main"
        );

        // Find product and validate it exists
        let product;
        if (isVariant) {
            product = await productModel.findOne({
                _id: productId,
                "variants._id": variantId
            });
        } else {
            product = await productModel.findById(productId);
        }

        if (!product) {
            return res.status(404).json({
                message: isVariant ? "Product variant not found" : "Product not found",
                success: false
            })
        }

        // Get stock for variant or default stock
        let stock = 999;
        let variantObj = null;
        if (isVariant) {
            stock = await stockOfVariant(productId, variantId);
            variantObj = product.variants.find(v => v._id.toString() === variantId);
        }

        // Get or create cart for user
        let cart = await cartModel.findOne({ user: req.user._id })
        if (!cart) {
            cart = await cartModel.create({ user: req.user._id })
        }

        // Check if item already in cart
        const existingItem = cart.items.find(item => {
            const sameProduct = item.product.toString() === productId;
            if (isVariant) {
                return sameProduct && item.variant?.toString() === variantId;
            } else {
                return sameProduct && !item.variant;
            }
        });

        if (existingItem) {
            // Product already in cart - update quantity
            const newQuantity = existingItem.quantity + quantity

            if (isVariant && newQuantity > stock) {
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
            if (isVariant && quantity > stock) {
                return res.status(400).json({
                    message: `Only ${stock} item(s) available in stock.`,
                    success: false
                })
            }

            const itemPrice = (isVariant && variantObj?.price?.amount)
                ? {
                    amount: variantObj.price.amount,
                    currency: variantObj.price.currency || product.price.currency || "INR"
                }
                : {
                    amount: product.price?.amount || 0,
                    currency: product.price?.currency || "INR"
                };

            // Add item to cart
            await cartModel.findOneAndUpdate(
                { user: req.user._id },
                {
                    $push: {
                        items: {
                            product: productId,
                            variant: isVariant ? variantId : null,
                            quantity: quantity,
                            price: itemPrice
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

    // Aggregation pipeline
    try {
        const cart = await cartModel.aggregatedb.getCollection('carts').aggregate
  [
    { $unwind: { path: '$items' } },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'items.product'
      }
    },
    { $unwind: { path: '$items.product' } },
    {
      $unwind: { path: '$items.product.variants' }
    },
    {
      $match: {
        $expr: {
          $eq: [
            '$items.variant',
            '$items.product.variants._id'
          ]
        }
      }
    },
    {
      $addFields: {
        itemPrice: {
          price: {
            $multiply: [
              '$items.quantity',
              '$items.product.variants.price.amount'
            ]
          },
          currency:
            '$items.product.variants.price.currency'
        }
      }
    },
    {
      $group: {
        _id: '$_id',
        totalPrice: { $sum: '$itemPrice.price' },
        currency: {
          $first: '$itemPrice.currency'
        },
        items: { $push: '$items' }
      }
    }
  ]

//   Aggregation pipeline end



        
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
        
        // Check stock before updating if it has a variant
        if (item.variant) {
            const stock = await stockOfVariant(item.product.toString(), item.variant.toString())
            if (quantity > stock) {
                return res.status(400).json({
                    message: `Only ${stock} item(s) available in stock`,
                    success: false
                })
            }
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