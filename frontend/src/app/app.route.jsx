import { createBrowserRouter } from "react-router";
import AppLayout from "../AppLayout.jsx";
import Register from "../features/auth/Pages/Register.jsx";
import Login from "../features/auth/Pages/Login.jsx";
import Home from "../features/product/pages/Home.jsx";
import CreateProduct from "../features/product/pages/CreateProduct.jsx";
import Dashboard from "../features/product/pages/Dashboard.jsx";
import Protected from "../features/auth/components/Protected.jsx";
import ProductDetail from "../features/product/pages/ProductDetail.jsx";
import SellerProductDetail from "../features/product/pages/SellerProductDetail.jsx";
import Cart from "../features/cart/pages/Cart.jsx";
import OrderSuccess from "../features/cart/pages/OrderSuccess.jsx";
import Orders from "../features/cart/pages/Orders.jsx";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/cart",
        element: (
          <Protected>
            <Cart />
          </Protected>
        ),
      },
      {
        path: "/order-success",
        element: (
          <Protected>
            <OrderSuccess />
          </Protected>
        ),
      },
      {
        path: "/orders",
        element: (
          <Protected>
            <Orders />
          </Protected>
        ),
      },
      {
        path: "/product/:productId",
        element: <ProductDetail />,
      },
      {
        path: "/seller",
        children: [
          {
            path: "/seller/create-product",
            element: (
              <Protected role="seller">
                <CreateProduct />
              </Protected>
            ),
          },
          {
            path: "/seller/dashboard",
            element: (
              <Protected role="seller">
                <Dashboard />
              </Protected>
            ),
          },
          {
            path: "/seller/product/:productId",
            element: (
              <Protected role="seller">
                <SellerProductDetail />
              </Protected>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
]);
