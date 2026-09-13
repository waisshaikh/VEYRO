import axios from "axios";

const productApiInstance = axios.create({
    baseURL: "/api/products",
    withCredentials: true
});

export async function createProduct(formData) {

    const response = await productApiInstance.post("/", formData)

    return response.data


}

export async function getSellerProduct() {

    const response = await productApiInstance.get("/seller")

    return response.data


}

export async function gettAllProducte() {
    const response = await productApiInstance.get("/")
    return response.data

}

export async function getProductById(productId) {
    const response = await productApiInstance.get(`/product/${productId}`)
    return response.data
}



export async function addProductVarient(productId, formData) {
    const response = await productApiInstance.post(`/seller/product/${productId}/variants`, formData)
    return response.data
}

export async function updateVariantStockApi(prsoductId, variantId, stock) {
    const response = await productApiInstance.patch(`/seller/prod uct/${productId}/variants/${variantId}/stock`, { stock });
    return response.data;
}

export async function updateVariantApi(productId, variantId, formData) {
    const response = await productApiInstance.put(`/seller/product/${productId}/variants/${variantId}`, formData);
    return response.data;
}

export async function deleteVariantApi(productId, variantId) {
    const response = await productApiInstance.delete(`/seller/product/${productId}/variants/${variantId}`);
    return response.data;
}

