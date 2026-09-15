import mongoose from "mongoose";
import priceSchema from "./price.schema.js";

const ProductSchema = new mongoose.Schema({
    tittle: {
        type: String,
        require: true,
    },

    description: {
        type: String,
        require: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    price: {
        type:priceSchema,
        required:true
    },


    images: [
        {
            type: String,
            required: true,
        },
    ],

    
    variants:[{
        images:[
            {
                url:{
                    type: String,
                    required: true
                }
            }
        ],

        stock: {
            type: Number,
            default: 0
        },
        attributes:{
            type:Map,
            of:String
        },
        price: {
            type: priceSchema,
            required: true
        }
    }],




},{timestamps:true })

const productModel = mongoose.model("product", ProductSchema)

export default productModel
    