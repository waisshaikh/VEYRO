import { json } from "express";
import productModel from "../models/product.model.js";
import { uploadFile } from "../services/storage.service.js";

export async function createProduct(req, res) {
    try {

        const { tittle, description, priceAmount, priceCurrency } = req.body
        const seller = req.user

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "At least one product image is required" })
        }

        const images = await Promise.all(req.files.map(async (file) => {
            return await uploadFile({
                buffer: file.buffer,
                fileName: file.originalname,
                mimeType: file.mimetype
            })
        }))


        const product = await productModel.create({
            tittle,
            description,
            price: {
                amount: priceAmount,
                currency: priceCurrency || "INR"
            },
            images,
            seller: seller._id
        })

        res.status(201).json({
            message: "Product created Succsessfully",
            success: true,
            product
        })
    } catch (error) {
        console.error("Create product error:", error)
        const statusCode = error.status || 500

        res.status(statusCode >= 500 ? 502 : statusCode).json({
            message: "Product creation failed",
            error: error.message || "Image upload failed",
            imageKitStatus: error.status,
            imageKitRequestId: error.imageKitRequestId
        })
    }


}


export async function getSellerProduct(req, res) {
    const seller = req.user

    const products = await productModel.find({ seller: seller._id }).sort({ _id: -1 })

    res.status(200).json({
        message: "All Product Fetched Successfully",
        success: true,
        products
    })

}

export async function getProductDetail(req, res) {
    const { id } = req.params;

    const product = await productModel.findById(id)
    if (!product) {
        return res.status(404).json({ message: "Product Not Found" })
        success: false
    }

    return res.status(200).json({
        message: "Product Detail Fetched Successfully",
        success: true,
        product
    })

}


export async function getAllProduct(req, res) {
    const products = await productModel.find()
    res.status(200).json({
        message: "All product fetched",
        success: true,
        products
    })
}

// ── Variant Management Handlers ─────────────────────────────────────────────                                                                         


export async function addProductVarient(req, res) {
    try {
        const productId = req.params.productId;
        const product = await productModel.findOne({
            _id: productId,
            seller: req.user._id
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                success: false
            });
        }

        // Upload images to ImageKit and format as objects

        const images = [];
        if (req.files && req.files.length > 0) {
            const uploadedImages = await Promise.all(
                req.files.map(async (file) => {
                    const imageUrl = await uploadFile({
                        buffer: file.buffer,
                        fileName: file.originalname,
                        mimeType: file.mimetype
                    });
                    // Return object with url property to match schema

                    return { url: imageUrl };
                })
            );
            images.push(...uploadedImages);
        }

        const priceAmount = req.body.priceAmount;
        const priceCurrency = req.body.priceCurrency || "INR";
        const stock = req.body.stock;
        const attributes = JSON.parse(req.body.attributes || "{}");

        // Create variant object

        const newVariant = {
            price: {
                amount: priceAmount,
                currency: priceCurrency
            },
            stock,
            attributes,
            images
        };

        // Add variant to product
        product.variants.push(newVariant);
        await product.save();

        res.status(201).json({
            message: "Variant added successfully",
            success: true,
            product
        });
    } catch (error) {
        console.error("Add variant error:", error);
        res.status(500).json({
            message: "Failed to add variant",
            success: false,
            error: error.message
        });
    }
}

// export async function addVariant(req, res) {
//     try {
//         const { productId } = req.params;
//         const { priceAmount, priceCurrency, stock, attributes, existingImages, images } = req.body;
//         const sellerId = req.user?._id;

//         const product = await productModel.findOne({ _id: productId, seller: sellerId });
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
//         }

//         // Upload any newly provided image files
//         let uploadedImages = [];
//         if (req.files && req.files.length > 0) {
//             uploadedImages = await Promise.all(
//                 req.files.map(async (file) => {
//                     const url = await uploadFile({
//                         buffer: file.buffer,
//                         fileName: file.originalname,
//                         mimeType: file.mimetype
//                     });
//                     return { url };
//                 })
//             );
//         }

//         // Parse any existing or gallery-picked images
//         let existingList = [];
//         const rawExisting = existingImages || images;
//         if (rawExisting) {
//             try {
//                 const parsed = typeof rawExisting === "string" ? JSON.parse(rawExisting) : rawExisting;
//                 if (Array.isArray(parsed)) {
//                     existingList = parsed
//                         .map((img) => (typeof img === "string" ? { url: img } : img))
//                         .filter((img) => img && img.url);
//                 } else if (typeof parsed === "object" && parsed?.url) {
//                     existingList = [parsed];
//                 }
//             } catch (e) {
//                 if (typeof rawExisting === "string" && rawExisting.trim().startsWith("http")) {
//                     existingList = [{ url: rawExisting.trim() }];
//                 }
//             }
//         }

//         const combinedImages = [...existingList, ...uploadedImages].slice(0, 7);

//         let parsedAttributes = attributes || {};
//         if (typeof attributes === "string") {
//             try {
//                 parsedAttributes = JSON.parse(attributes);
//             } catch (e) {
//                 parsedAttributes = {};
//             }
//         }

//         const newVariant = {
//             price: {
//                 amount: Number(priceAmount) || product.price?.amount || 0,
//                 currency: priceCurrency || product.price?.currency || "INR"
//             },
//             stock: Math.max(0, Number(stock) || 0),
//             attributes: parsedAttributes,
//             images: combinedImages
//         };

//         product.variants.push(newVariant);
//         await product.save();

//         const createdVariant = product.variants[product.variants.length - 1];

//         res.status(201).json({
//             success: true,
//             message: "Variant added successfully",
//             variant: createdVariant,
//             product
//         });
//     } catch (error) {
//         console.error("Add variant error:", error);
//         res.status(500).json({ success: false, message: "Failed to add variant", error: error.message });
//     }
// }

// export async function updateVariantStock(req, res) {
//     try {
//         const { productId, variantId } = req.params;
//         const { stock } = req.body;
//         const sellerId = req.user?._id;

//         const product = await productModel.findOne({ _id: productId, seller: sellerId });
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
//         }

//         const variant = product.variants.id(variantId);
//         if (!variant) {
//             return res.status(404).json({ success: false, message: "Variant not found" });
//         }

//         variant.stock = Math.max(0, Number(stock) || 0);
//         await product.save();

//         res.status(200).json({
//             success: true,
//             message: "Stock updated successfully",
//             variant,
//             product
//         });
//     } catch (error) {
//         console.error("Update variant stock error:", error);
//         res.status(500).json({ success: false, message: "Failed to update stock", error: error.message });
//     }
// }

export async function updateVariant(req, res) {
    try {
        const { productId, variantId } = req.params;
        const { priceAmount, priceCurrency, stock, attributes, existingImages, images } = req.body;
        const sellerId = req.user?._id;

        const product = await productModel.findOne({ _id: productId, seller: sellerId });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
        }

        const variant = product.variants.id(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        if (priceAmount !== undefined) {
            variant.price.amount = Number(priceAmount);
        }
        if (priceCurrency) {
            variant.price.currency = priceCurrency;
        }
        if (stock !== undefined) {
            variant.stock = Math.max(0, Number(stock));
        }
        if (attributes !== undefined) {
            let parsedAttributes = attributes;
            if (typeof attributes === "string") {
                try {
                    parsedAttributes = JSON.parse(attributes);
                } catch (e) {
                    parsedAttributes = {};
                }
            }
            variant.attributes = parsedAttributes;
        }

        // Upload any newly provided image files
        let uploadedImages = [];
        if (req.files && req.files.length > 0) {
            uploadedImages = await Promise.all(
                req.files.map(async (file) => {
                    const url = await uploadFile({
                        buffer: file.buffer,
                        fileName: file.originalname,
                        mimeType: file.mimetype
                    });
                    return { url };
                })
            );
        }

        const rawExisting = existingImages !== undefined ? existingImages : images;
        if (rawExisting !== undefined || uploadedImages.length > 0) {
            let existingList = [];
            if (rawExisting) {
                try {
                    const parsed = typeof rawExisting === "string" ? JSON.parse(rawExisting) : rawExisting;
                    if (Array.isArray(parsed)) {
                        existingList = parsed
                            .map((img) => (typeof img === "string" ? { url: img } : img))
                            .filter((img) => img && img.url);
                    } else if (typeof parsed === "object" && parsed?.url) {
                        existingList = [parsed];
                    }
                } catch (e) {
                    if (typeof rawExisting === "string" && rawExisting.trim().startsWith("http")) {
                        existingList = [{ url: rawExisting.trim() }];
                    }
                }
            }
            variant.images = [...existingList, ...uploadedImages].slice(0, 7);
        }

        await product.save();

        res.status(200).json({
            success: true,
            message: "Variant updated successfully",
            variant,
            product
        });
    } catch (error) {
        console.error("Update variant error:", error);
        res.status(500).json({ success: false, message: "Failed to update variant", error: error.message });
    }
}

// export async function deleteVariant(req, res) {
//     try {
//         const { productId, variantId } = req.params;
//         const sellerId = req.user?._id;

//         const product = await productModel.findOne({ _id: productId, seller: sellerId });
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
//         }

//         product.variants.pull({ _id: variantId });
//         await product.save();

//         res.status(200).json({
//             success: true,
//             message: "Variant deleted successfully",
//             product
//         });
//     } catch (error) {
//         console.error("Delete variant error:", error);
//         res.status(500).json({ success: false, message: "Failed to delete variant", error: error.message });
//     }
// }
