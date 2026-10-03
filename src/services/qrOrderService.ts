import api from '../lib/apiClient';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  image?: string;
  isVegetarian?: boolean;
  dietary?: string;
  isAvailable?: boolean;
  isIngredient?: boolean;
  productType?: string;
  taxRate?: number;
  taxCode?: string;
  isPackagedGood?: boolean;
  isPackaged?: boolean;
  outOfStock?: boolean;
  currentStock?: number | null;
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    outOfStock?: boolean;
    currentStock?: number | null;
  }>;
}

export interface ActiveOrderLine {
  id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  categoryName?: string;
}

export interface ActiveOrder {
  id: string;
  orderNo: string;
  orderStatus: string;
  paymentStatus: string;
  grandTotal: number;
  totalAmount: number;
  lines: ActiveOrderLine[];
  orderDate?: string;
  createdAt: string;
  updatedAt?: string;
  tableNumber?: string;
}

export interface TableSessionInfo {
  found: boolean;
  tableId: string;
  tableNumber: string;
  capacity?: number;
  location?: string;
  branchName?: string;
  branchCode?: string;
  branchSlug?: string;
  restaurantName?: string;
  clientName?: string;
  currency?: string;
  currencySymbol?: string;
  currencyDecimalPlaces?: number;
  onlinePaymentEnabled?: boolean;
  activeOrder?: ActiveOrder | null;
  taxEnabled?: boolean;
  pricesIncludeTax?: boolean;
  taxLabelGlobal?: string;
  taxSplitEnabled?: boolean;
  taxRate?: number;
  taxName?: string;
  taxRates?: Array<{ id: string; name: string; value: number }>;
  taxDefaultId?: string;
  inventoryEnabled?: boolean;
  loyaltyEnabled?: boolean;
  status?: string;
  message?: string;
  error?: string;
  isSubscriptionError?: boolean;
}

export interface OrderItemPayload {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  price: number;
  category?: string;
}

export interface CreateOrderPayload {
  tableId: string;
  tableNumber?: string;
  items: OrderItemPayload[];
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  customerId?: string;
  paymentMethod?: string;
}

export interface CustomerAuth {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export const qrOrderService = {
  /**
   * Fetches table metadata and active open tab session (if any).
   * GET /api/v1/public/menu/{clientId}/{orgId}/table/{tableId}
   */
  async fetchTableSession(clientId: string, orgId: string, tableId: string): Promise<TableSessionInfo> {
    const res = await api.get(`/v1/public/menu/${clientId}/${orgId || 'null'}/table/${tableId}`);
    return res.data?.data || res.data;
  },

  /**
   * Fetches the full active digital menu for the branch.
   * GET /api/v1/public/menu/{clientId}/{orgId}
   */
  async fetchMenu(clientId: string, orgId: string): Promise<MenuItem[]> {
    const res = await api.get(`/v1/public/menu/${clientId}/${orgId || 'null'}`);
    return res.data?.data || res.data || [];
  },

  /**
   * Submits a new order or appends items to an existing open table tab.
   * POST /api/v1/public/menu/{clientId}/{orgId}/order
   */
  async submitOrder(clientId: string, orgId: string, payload: CreateOrderPayload): Promise<any> {
    const res = await api.post(`/v1/public/menu/${clientId}/${orgId || 'null'}/order`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Checks if customer exists by email.
   * POST /api/v1/public/customer/check-email
   */
  async checkEmail(email: string, clientId: string): Promise<{ exists: boolean; name?: string; phone?: string }> {
    const res = await api.post('/v1/public/customer/check-email', { email, clientId });
    return res.data?.data || res.data;
  },

  /**
   * Sends OTP for guest customer verification.
   * POST /api/v1/public/customer/send-otp
   */
  async sendOtp(identifier: string): Promise<any> {
    const res = await api.post('/v1/public/customer/send-otp', { identifier });
    return res.data;
  },

  /**
   * Verifies OTP and registers or retrieves customer.
   * POST /api/v1/public/customer/verify-otp
   */
  async verifyOtp(payload: {
    identifier: string;
    name?: string;
    phone?: string;
    otp: string;
    clientId: string;
    orgId?: string;
  }): Promise<CustomerAuth> {
    const res = await api.post('/v1/public/customer/verify-otp', payload);
    return res.data?.data || res.data;
  },
};

export default qrOrderService;
