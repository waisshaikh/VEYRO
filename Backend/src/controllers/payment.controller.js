import paymentModel from "../models/payment.model.js"
import cartModel from "../models/cart.model.js"
import productModel from "../models/product.model.js"
import { getCartDetails } from "../dao/cartDetail.dao.js"
import crypto from "crypto"
import { config } from "../config/config.js"

// Create pending payment when user clicks checkout
export const createPendingPaymentController = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId, amount, currency, shippingAddress } = req.body;

        if (!orderId || !amount) {
            return res.status(400).json({
                message: "Missing order details",
                success: false
            });
        }

        // Get cart to store items
        const cart = await getCartDetails(userId);
        const cartData = cart.length > 0 ? cart[0] : null;

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty",
                success: false
            });
        }

        // Transform cart items
        const orderItems = await Promise.all(cartData.items.map(async (item) => {
            const product = await productModel.findById(item.product?._id || item.product);
            const rawImages = product?.images || [];
            const processedImages = rawImages.map(img => {
                if (typeof img === "string") return { url: img };
                if (img?.url) return { url: img.url };
                return { url: "" };
            }).filter(i => i.url);

            return {
                tittle: product?.tittle || "Unknown Product",
                productId: item.product?._id || item.product,
                variantId: item.variant || null,
                quantity: item.quantity,
                images: processedImages,
                price: {
                    amount: item.price?.amount || 0,
                    currency: item.price?.currency || cartData.currency || "INR"
                },
                seller: product?.seller || null,
                orderStatus: "Confirmed"
            };
        }));

        // Create pending payment
        const payment = await paymentModel.create({
            razorpay: {
                orderId: orderId,
                paymentId: null,
                signature: null
            },
            price: {
                amount: amount || cartData.totalPrice || 0,
                currency: currency || cartData.currency || "INR"
            },
            status: "pending",
            user: userId,
            shippingAddress: shippingAddress || null,
            orderitems: orderItems
        });

        console.log('Pending payment created:', payment._id);

        return res.status(200).json({
            message: "Payment created with pending status",
            success: true,
            paymentId: payment._id,
            orderId: payment.razorpay.orderId
        });

    } catch (error) {
        console.error("Error in createPendingPaymentController:", error);
        return res.status(500).json({
            message: "Failed to create pending payment",
            success: false,
            error: error.message
        });
    }
};

export const verifyPaymentController = async (req, res) => {
    try {
        console.log('VERIFY PAYMENT CALLED - Body:', req.body);
        console.log('VERIFY PAYMENT CALLED - User:', req.user?._id);
        
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, status } = req.body;
        const userId = req.user._id;

        if (!razorpay_order_id) {
            console.log('Missing order ID');
            return res.status(400).json({
                message: "Missing order ID",
                success: false
            });
        }

        // Find existing pending payment by orderId
        const existingPayment = await paymentModel.findOne({
            'razorpay.orderId': razorpay_order_id,
            user: userId
        });

        if (!existingPayment) {
            console.log('No pending payment found for order:', razorpay_order_id);
            return res.status(404).json({
                message: "No pending payment found for this order",
                success: false
            });
        }

        console.log('Found pending payment:', existingPayment._id);

        //  VERIFY RAZORPAY SIGNATURE - Security check
        if (razorpay_payment_id && razorpay_signature) {
            const expectedSignature = crypto
                .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            console.log('Verifying Razorpay signature...');

            if (expectedSignature !== razorpay_signature) {
                console.error('Invalid Razorpay signature - possible fraud attempt!');
                return res.status(400).json({
                    message: "Invalid payment signature - verification failed",
                    success: false
                });
            }
            console.log(' Razorpay signature verified successfully');
        }

        // Update the existing payment
        existingPayment.razorpay.paymentId = razorpay_payment_id || existingPayment.razorpay.paymentId;
        existingPayment.razorpay.signature = razorpay_signature || existingPayment.razorpay.signature;
        
        // Determine final status
        const finalStatus = status || (razorpay_payment_id ? "paid" : "failed");
        existingPayment.status = finalStatus;

        await existingPayment.save();

        if (existingPayment.status === "paid") {
            await cartModel.findOneAndUpdate(
                { user: userId },
                { $set: { items: [] } },
                { new: true }
            );
            console.log('User cart cleared in DB after payment verification');
        }

        console.log('Payment updated:', existingPayment._id, 'Status:', existingPayment.status);

        return res.status(200).json({
            message: `Payment ${existingPayment.status} successfully`,
            success: true,
            payment: existingPayment
        });

    } catch (error) {
        console.error("Error in verifyPaymentController:", error);
        return res.status(500).json({
            message: "Failed to verify payment",
            success: false,
            error: error.message
        });
    }
}

export const getPaymentByIdController = async (req, res) => {
    try {
        const paymentId = req.params.id
        const payment = await paymentModel.findById(paymentId).populate('user')

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found",
                success: false
            })
        }

        return res.status(200).json({
            message: "Payment fetched successfully",
            success: true,
            payment
        })

    } catch (error) {
        console.error("Error in getPaymentByIdController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
};

// Get payment by Razorpay orderId
export const getPaymentByOrderIdController = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const payment = await paymentModel.findOne({ 'razorpay.orderId': orderId }).populate('user');

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found for this order ID",
                success: false
            });
        }

        return res.status(200).json({
            message: "Payment fetched successfully",
            success: true,
            payment
        });

    } catch (error) {
        console.error("Error in getPaymentByOrderIdController:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        });
    }
};

export const getUserPaymentsController = async (req, res) => {
    try {
        const userId = req.user._id
        const payments = await paymentModel.find({ user: userId })
            .populate('orderitems.productId', 'tittle images price')
            .sort({ createdAt: -1 })

        return res.status(200).json({
            message: "Payments fetched successfully",
            success: true,
            payments
        })

    } catch (error) {
        console.error("Error in getUserPaymentsController:", error)
        return res.status(500).json({
            message: "Internal server error",
            success: false,
            error: error.message
        })
    }
}

// Fetch orders containing products owned by the logged-in seller ONLY
export const getSellerOrdersController = async (req, res) => {
    try {
        const sellerId = req.user._id;

        // 1. Find all product IDs owned by this seller
        const sellerProducts = await productModel.find({ seller: sellerId }).select("_id tittle images price");
        const sellerProductIds = sellerProducts.map(p => p._id.toString());

        if (sellerProductIds.length === 0) {
            return res.status(200).json({
                message: "No products or orders found for this seller",
                success: true,
                orders: []
            });
        }

        // 2. Query payments containing products belonging to this seller
        const payments = await paymentModel.find({
            status: { $in: ["paid", "pending"] },
            $or: [
                { "orderitems.productId": { $in: sellerProductIds } },
                { "orderitems.seller": sellerId }
            ]
        }).populate("user", "name email").sort({ _id: -1 });

        // 3. Extract items belonging ONLY to this seller
        const sellerOrders = [];

        payments.forEach(payment => {
            (payment.orderitems || []).forEach(item => {
                const itemProdId = item.productId ? item.productId.toString() : "";
                const itemSellerId = item.seller ? item.seller.toString() : "";

                if (sellerProductIds.includes(itemProdId) || itemSellerId === sellerId.toString()) {
                    const matchedProduct = sellerProducts.find(p => p._id.toString() === itemProdId);
                    
                    let primaryImage = item.images?.[0]?.url || item.images?.[0] || "";
                    if (!primaryImage && matchedProduct?.images?.[0]) {
                        const raw = matchedProduct.images[0];
                        primaryImage = typeof raw === "string" ? raw : raw?.url || "";
                    }

                    sellerOrders.push({
                        paymentId: payment._id,
                        orderId: payment._id,
                        razorpayOrderId: payment.razorpay?.orderId || "N/A",
                        razorpayPaymentId: payment.razorpay?.paymentId || "N/A",
                        paymentStatus: payment.status,
                        orderStatus: item.orderStatus || "Confirmed",
                        item: {
                            tittle: item.tittle || matchedProduct?.tittle || "Product Item",
                            productId: item.productId,
                            variantId: item.variantId || null,
                            quantity: item.quantity || 1,
                            price: item.price || matchedProduct?.price || { amount: 0, currency: "INR" },
                            image: primaryImage
                        },
                        buyer: {
                            name: payment.shippingAddress?.fullName || payment.user?.name || "Customer",
                            email: payment.user?.email || "N/A",
                            phone: payment.shippingAddress?.phone || "N/A"
                        },
                        shippingAddress: payment.shippingAddress || null,
                        createdAt: payment.createdAt || (payment._id.getTimestamp ? payment._id.getTimestamp() : new Date())
                    });
                }
            });
        });

        return res.status(200).json({
            message: "Seller orders fetched successfully",
            success: true,
            orders: sellerOrders
        });

    } catch (error) {
        console.error("Error in getSellerOrdersController:", error);
        return res.status(500).json({
            message: "Failed to fetch seller orders",
            success: false,
            error: error.message
        });
    }
};

// Update order status (Confirmed, Shipped, Delivered, Cancelled) for seller's own product
export const updateSellerOrderStatusController = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { paymentId, productId, orderStatus } = req.body;

        if (!paymentId || !productId || !orderStatus) {
            return res.status(400).json({
                message: "paymentId, productId, and orderStatus are required",
                success: false
            });
        }

        const validStatuses = ["Confirmed", "Shipped", "Delivered", "Cancelled"];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
                success: false
            });
        }

        // Security Check: Verify product belongs to the seller requesting the update
        const product = await productModel.findOne({ _id: productId, seller: sellerId });
        if (!product) {
            return res.status(403).json({
                message: "Unauthorized: You can only manage orders for products you own",
                success: false
            });
        }

        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                message: "Order record not found",
                success: false
            });
        }

        let updated = false;
        payment.orderitems.forEach(item => {
            if (item.productId && item.productId.toString() === productId.toString()) {
                item.orderStatus = orderStatus;
                updated = true;
            }
        });

        if (!updated) {
            return res.status(404).json({
                message: "Product item not found in this order",
                success: false
            });
        }

        await payment.save();

        return res.status(200).json({
            message: `Order status updated to ${orderStatus}`,
            success: true,
            orderStatus
        });

    } catch (error) {
        console.error("Error in updateSellerOrderStatusController:", error);
        return res.status(500).json({
            message: "Failed to update order status",
            success: false,
            error: error.message
        });
    }
};

