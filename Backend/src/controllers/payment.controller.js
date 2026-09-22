import paymentModel from "../models/payment.model.js"
import cartModel from "../models/cart.model.js"
import productModel from "../models/product.model.js"
import { getCartDetails } from "../dao/cartDetail.dao.js"

// Create pending payment when user clicks checkout
export const createPendingPaymentController = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId, amount, currency } = req.body;

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
            return {
                tittle: product?.tittle || "Unknown Product",
                productId: item.product?._id || item.product,
                variantId: item.variant || null,
                quantity: item.quantity,
                images: (product?.images || []).map(img => ({ url: img })),
                price: {
                    amount: item.price?.amount || 0,
                    currency: item.price?.currency || cartData.currency || "INR"
                }
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

        // Update the existing payment
        existingPayment.razorpay.paymentId = razorpay_payment_id || existingPayment.razorpay.paymentId;
        existingPayment.razorpay.signature = razorpay_signature || existingPayment.razorpay.signature;
        
        // Determine final status
        const finalStatus = status || (razorpay_payment_id ? "paid" : "failed");
        existingPayment.status = finalStatus;

        await existingPayment.save();

        console.log('Payment updated:', existingPayment._id, 'Status:', existingPayment.status);

        // Cart clearing is now handled manually by frontend
        // Removed automatic cart clearing

        return res.status(200).json({
            message: `Payment ${existingPayment.status} successfully`,
            success: true,
            payment: existingPayment
        });

    } catch (error) {
        console.error("Error in verifyPaymentController:", error);
        console.error("Stack trace:", error.stack);
        return res.status(500).json({
            message: "Failed to verify payment",
            success: false,
            error: error.message,
            details: error.stack
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
}

export const getUserPaymentsController = async (req, res) => {
    try {
        const userId = req.user._id
        const payments = await paymentModel.find({ user: userId })
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
