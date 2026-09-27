import mongoose from "mongoose";
import priceSchema from "./price.schema.js";

const orderItemSchema = new mongoose.Schema({
    tittle: String,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
    variantId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    images: [{ url: String }],
    price: priceSchema,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    orderStatus: {
        type: String,
        enum: ["Confirmed", "Shipped", "Delivered", "Cancelled"],
        default: "Confirmed"
    }
});

const paymentSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },

    price: {
        type: priceSchema,
        required: true
    },

    razorpay: {
        orderId: String,
        paymentId: String,
        signature: String
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    orderitems: [orderItemSchema]
}, { timestamps: true });

const paymentModel = mongoose.model("payment", paymentSchema);

export default paymentModel;