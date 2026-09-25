export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const API_ENDPOINTS = {
    REGISTER:'/auth/register',
    LOGIN:'/auth/login',
    GOOGLE_LOGIN:'/auth/google-login',
    REFRESH_TOKEN:'/auth/refresh-token',
    LOGOUT:'/auth/logout',
    PROFILE:'/auth/profile',
    CHANGE_PASSWORD:'/auth/change-password',
    ASSIGN_ADMIN:'/auth/assign-admin',
    REMOVE_ADMIN:'/auth/remove-admin',
    ASSIGN_RESTAURANT_OWNER:'/auth/assign-restaurant-owner',
    REMOVE_RESTAURANT_OWNER:'/auth/remove-restaurant-owner',
    DELETE_USER:'/auth/accountdelete',

    GET_ALL_RESTAURANTS:'/restaurants',
    SEARCH_RESTAURANTS:'/restaurants/search',
    UPDATE_RESTAURANT:'/restaurants/:restaurantId/update',
    CREATE_RESTAURANT:'/restaurants/create',
    DELETE_RESTAURANT:'/restaurants/:restaurantId',
    GET_RESTAURANT_BY_ID:'/restaurants/:id',
    MY_RESTAURANTS:'/restaurants/my',

    MENU:'/menu/:restaurantName',
    SEARCH_MENU:'/menu/search',
    ADD_MENU_ITEM:'/menu/items/:restaurantId',
    UPDATE_MENU_ITEM:'/menu/:restaurantId/items/:itemId',
    DELETE_MENU_ITEM:'/menu/items/:restaurantId/:itemId',
    TOGGLE_MENU_ITEM_AVAILABILITY:'/menu/:restaurantId/items/:itemId/availability',
    BULK_DISCOUNT_MENU:'/menu/:restaurantId/items/discount-all',



    CART:'/cart',
    ADD_TO_CART:'/cart/add',
    UPDATE_CART_ITEM_QUANTITY:'/cart/:cartItemId',
    REMOVE_FROM_CART:'/cart/:cartItemId',
    CLEAR_CART:'/cart/clear',

    CREATE_ORDER: '/orders',
    GET_MY_ORDERS: '/orders/my',
    GET_OWNER_ORDERS: '/orders/owner',
    UPDATE_ORDER_STATUS: '/orders/:id/status',

    ASSIGN_DELIVERY_PARTNER: '/auth/assign-delivery-partner',
    REMOVE_DELIVERY_PARTNER: '/auth/remove-delivery-partner',
    GET_AVAILABLE_ORDERS: '/delivery/available',
    GET_MY_DELIVERIES: '/delivery/my-deliveries',
    PICK_ORDER: '/delivery/:id/pick',
    DELIVER_ORDER: '/delivery/:id/deliver',
    ORDER_EVENTS: '/orders/events',
    SUGGEST_ITEM_DESCRIPTION: '/menu/ai/suggest-description',
    AI_SEARCH_MENU: '/menu/ai-search',
}
