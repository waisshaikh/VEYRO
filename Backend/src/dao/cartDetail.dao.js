import cartModel from "../models/cart.model.js"
import mongoose from "mongoose"
import productModel from "../models/product.model.js"

export  async function getCartDetails(userId) {
    // Find cart and populate product for each item
    const cart = await cartModel.findOne({ user: userId })
        .populate({
            path: 'items.product',
            populate: { path: 'variants' }
        });

    if (!cart) {
        return [];
    }

    // Calculate total price and currency
    const totalPrice = cart.items.reduce((sum, item) => {
        return sum + (item.price?.amount || 0) * (item.quantity || 1);
    }, 0);

    const currency = cart.items[0]?.price?.currency || "INR";

    // Return in same format as before for compatibility
    return [{
        _id: cart._id,
        user: cart.user,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        items: cart.items,
        totalPrice: totalPrice,
        currency: currency
    }];

}