import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { Link } from "react-router";
import "../styles/Cart.css";

const Orders = () => {
  const user = useSelector((state) => state.user);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await axios.get("/api/payment", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setPayments(response.data.payments || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load your orders");
        setLoading(false);
      }
    };

    if (user) {
      fetchPayments();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🔒</div>
          <p>Please login to view your orders</p>
          <Link to="/login" className="btn-continue-shopping">
            Login
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
          <p>Loading your orders...</p>
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
          <button onClick={() => window.location.reload()} className="btn-continue-shopping">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">📋</div>
          <p>Make your first order</p>
          <p className="empty-cart-subtext">Your orders will appear here</p>
          <Link to="/" className="btn-continue-shopping">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p className="orders-count">{payments.length} orders found</p>
      </div>

      <div className="orders-list">
        {payments.map((payment) => (
          <div key={payment._id} className="order-card">
            <div className="order-card-header">
              <div className="order-id">
                <span className="order-label">Order ID:</span>
                <span className="order-value">{payment.razorpay?.orderId || payment._id}</span>
              </div>
              <div className={`status-badge status-${payment.status}`}>
                {payment.status === "paid" ? "Paid" : 
                 payment.status === "pending" ? "Pending" : "Failed"}
              </div>
            </div>

            <div className="order-card-body">
              <div className="order-info-row">
                <span className="order-label">Payment ID:</span>
                <span className="order-value">{payment.razorpay?.paymentId || "N/A"}</span>
              </div>
              
              <div className="order-info-row">
                <span className="order-label">Date:</span>
                <span className="order-value">
                  {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="order-info-row">
                <span className="order-label">Amount:</span>
                <span className="order-value">
                  ₹{payment.price?.amount || 0}
                </span>
              </div>

              <div className="order-info-row">
                <span className="order-label">Items:</span>
                <span className="order-value">{payment.orderitems?.length || 0}</span>
              </div>
            </div>

            <div className="order-card-footer">
              <Link 
                to={`/order-details/${payment._id}`}
                className="btn-view-details"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
