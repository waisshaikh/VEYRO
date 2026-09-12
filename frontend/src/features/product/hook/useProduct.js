import {
    createProduct,
    getProductById,
    getSellerProduct,
    gettAllProducte,
    addProductVarient,
    updateVariantStockApi,
    updateVariantApi,
    deleteVariantApi
} from "../services/product.api";
import { useDispatch } from "react-redux";
import { setSellerProduct, setproducts } from "../state/product.store.js"

export const useProduct = () => {
    const dispath = useDispatch()

    async function handleCreateproduct(formData) {
        const data = await createProduct(formData)
        return data.product
    }

    async function handleGetSellerproduct() {
        const data = await getSellerProduct()
        dispath(setSellerProduct(data.products))
        return data.products
    }

    async function handelGetProduct() {
        const data = await gettAllProducte()
        dispath(setproducts(data.products))
        return data.products
    }

    async function handleGetProductByid(productId) {
        const data = await getProductById(productId)
        return data.product
    }

    async function handleAddVariant(productId, formData) {
        const data = await addProductVarient(productId, formData);
        return data;
    }

    async function handleUpdateVariantStock(productId, variantId, stock) {
        const data = await updateVariantStockApi(productId, variantId, stock);
        return data;
    }

    async function handleUpdateVariant(productId, variantId, formData) {
        const data = await updateVariantApi(productId, variantId, formData);
        return data;
    }

    async function handleDeleteVariant(productId, variantId) {
        const data = await deleteVariantApi(productId, variantId);
        return data;
    }

    return {
        handleCreateproduct,
        handleGetSellerproduct,
        handelGetProduct,
        handleGetProductByid,
        handleAddVariant,
        handleUpdateVariantStock,
        handleUpdateVariant,
        handleDeleteVariant
    }
}
