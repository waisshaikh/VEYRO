import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { useSelector } from "react-redux";
import axios from "axios";
import "../styles/Cart.css";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get orderId from navigation state
  const orderId = location.state?.orderId;

  useEffect(() => {
    // If no orderId in state, redirect to cart
    if (!orderId) {
      navigate("/cart");
      return;
    }

    // Fetch payment details using orderId
    const fetchPaymentDetails = async () => {
      try {
        const response = await axios.get(`/api/payment/order/${orderId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setOrderDetails(response.data.payment);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching payment details:", err);
        setError("Failed to load order details");
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [orderId, navigate]);

  if (!orderId) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">❌</div>
          <p>No order found</p>
          <Link to="/cart" className="btn-continue-shopping">
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cart-container">
        <div className="cart-loading">
          <div className="spinner"></div>
          <p>Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">⚠️</div>
          <p>{error}</p>
          <Link to="/cart" className="btn-continue-shopping">
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="order-success-container">
        <div className="success-icon">✅</div>
        
        <h1 className="success-title">Payment Successful!</h1>
        <p className="success-subtitle">
          Thank you for your order. Your payment has been processed successfully.
        </p>

        <div className="order-details">
          <h2>Order Details</h2>
          
          <div className="order-info">
            <div className="order-info-row">
              <span className="order-label">Order ID:</span>
              <span className="order-value">{orderId}</span>
            </div>

            {orderDetails && (
              <>
                <div className="order-info-row">
                  <span className="order-label">Payment ID:</span>
                  <span className="order-value">{orderDetails.razorpay?.paymentId || "N/A"}</span>
                </div>

                <div className="order-info-row">
                  <span className="order-label">Amount:</span>
                  <span className="order-value">
                    ₹{orderDetails.price?.amount || 0}
                  </span>
                </div>

                <div className="order-info-row">
                  <span className="order-label">Status:</span>
                  <span className={`order-value status-badge status-${orderDetails.status}`}>
                    {orderDetails.status === "paid" ? "Paid" : orderDetails.status}
                  </span>
                </div>

                <div className="order-info-row">
                  <span className="order-label">Items:</span>
                  <span className="order-value">{orderDetails.orderitems?.length || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="success-actions">
          <Link to="/" className="btn-continue-shopping">
            Continue Shopping
          </Link>
          <Link to="/orders" className="btn-view-orders">
            View My Orders
          </Link>
        </div>

        <div className="security-note">
          <span>🔒</span>
          <span>Secure Payment • Veyro Guarantee</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
