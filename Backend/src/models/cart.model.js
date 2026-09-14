import mongoose from "mongoose";
import priceSchema from "./price.schema";

const cartSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'user',
        success:true
    },

    items:[{
        product:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'product'
        },

        variant:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'variant'
        },

        quantity:{
            type:Number,
            default: 1

        },

       price:{
        type:priceSchema,
        required:ture
       }   
    }
    ]


})


const cartModel = mongoose.model("cart", cartSchema);

export default cartModel