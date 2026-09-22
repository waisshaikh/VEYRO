import cartModel from "../models/cart.model.js"
import mongoose from "mongoose"

export  async function getCartDetails(userId) {

    // Aggregation pipeline
        const cart = await cartModel.aggregate([
            { $match: { user: userId} },
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'items.product'
                }
            },
            { $unwind: { path: '$items.product', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    user: { $first: '$user' },
                    createdAt: { $first: '$createdAt' },
                    updatedAt: { $first: '$updatedAt' },
                    items: { 
                        $push: { 
                            $cond: [
                                { $ifNull: ['$items', false] },
                                '$items',
                                '$$REMOVE'
                            ]
                        }
                    },
                    totalPrice: { 
                        $sum: { 
                            $multiply: [
                                { $ifNull: ['$items.quantity', 0] },
                                { $ifNull: ['$items.price.amount', 0] }
                            ]
                        }
                    },
                    currency: { 
                        $first: { 
                            $ifNull: ['$items.price.currency', 'INR'] 
                        } 
                    }
                }
            }
        ])

        return cart
    
}