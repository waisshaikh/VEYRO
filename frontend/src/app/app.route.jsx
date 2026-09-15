import { createBrowserRouter } from "react-router";
import Register from "../features/auth/Pages/Register.jsx";
import Login from "../features/auth/Pages/Login.jsx";
import Home from "../features/product/pages/Home.jsx";
import CreateProduct from "../features/product/pages/CreateProduct.jsx";
import Dashboard from "../features/product/pages/Dashboard.jsx";
import Protected from "../features/auth/components/Protected.jsx";
import ProductDetail from "../features/product/pages/ProductDetail.jsx";
import SellerProductDetail from "../features/product/pages/SellerProductDetail.jsx"
import Cart from "../features/cart/pages/Cart.jsx"


export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home/>,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/cart",
    element: <Protected><Cart /></Protected>,
  },
  {
    path: "/seller",
    children:[
      {
        path:"/seller/create-product",
        element: <Protected role="seller">  <CreateProduct />  </Protected> ,
      },

      {
        path:"/seller/dashboard",
        element:<Protected role="seller"> <Dashboard /> </Protected>
      },

      {
        path:"/seller/product/:productId",
        element:<Protected role="seller"> <SellerProductDetail/> </Protected>
      },
    
      

    ] 
  },


  
  {
    path:"/product/:productId",
    element:<ProductDetail/>
  }

]);
