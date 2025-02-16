import Razorpay from "razorpay";
import httpStatus from "http-status";
import { config } from "../config/dotenv.config";
import { ApiError } from "../utils/express.utils";

const { RAZOR_PAY_KEY, RAZOR_PAY_SECRET } = config;

// Define Razorpay Client
const razorpay = new Razorpay({
  key_id: RAZOR_PAY_KEY,
  key_secret: RAZOR_PAY_SECRET,
});

export interface RazorpayOrderCreateRequestBody {
  // token: RazorpayTokenCard ;
  amount: number; // Amount in paise (10000 = ₹100)
  currency: "INR" | "USD" | "EUR"; // Supported currencies
  receipt: string; // Unique receipt number
  payment_capture?: boolean | undefined; // 1: Auto-capture, 0: Manual
  notes?: Record<string, string>; // Optional metadata
  method?: string; // Payment method (UPI, Card, etc.)
  customer_id: string; // Razorpay Customer ID
  partial_payment?: boolean; // Whether partial payments are allowed
}

// ✅ Customer Create Request
export interface RazorpayCustomerCreateRequestBody {
  name: string;
  email: string;
  contact: string;
  fail_existing?: 0 | 1; // 0: Create new customer, 1: Fail if customer exists
  gstin?: string;
  notes?: Record<string, string>; // Optional key-value pair for additional details
}

export interface RazorpayPlanCreateRequestBody {
  period: "daily" | "weekly" | "monthly" | "yearly";
  interval: number; // E.g., 1 for every month, 3 for every 3 months
  item: {
    name: string;
    description?: string;
    amount: number; // Amount in paise (e.g., 10000 = ₹100)
    currency: "INR" | "USD" | "EUR"; // Supported currencies
  };
  notes?: Record<string, string>;
}

export interface RazorpaySubscriptionCreateRequestBody {
  plan_id: string; // Razorpay Plan ID
  customer_notify?: boolean; // Whether to notify the customer
  quantity?: number;
  start_at?: number; // Timestamp in seconds (future date for subscription start)
  total_count: number; // Total number of billing cycles
  addons?: {
    item: {
      name: string;
      amount: number;
      currency: "INR" | "USD" | "EUR";
    };
  }[];
  notes?: Record<string, string>;
}

export const createRPayCustomer = async (
  customerData: RazorpayCustomerCreateRequestBody
) => {
  try {
    const customer = await razorpay.customers.create({
      name: customerData.name,
      email: customerData.email,
      contact: customerData.contact,
      fail_existing: 0,
    });
    return customer;
  } catch (error: unknown) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Error while creating Razorpay customer"
    );
  }
};

export const updateRPayCustomer = async (
  customerId: string,
  customerData: RazorpayCustomerCreateRequestBody
) => {
  try {
    const customer = await razorpay.customers.edit(customerId, {
      name: customerData.name,
      email: customerData.email,
      contact: customerData.contact,
    });
    return customer;
  } catch (error: unknown) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Error updating Razorpay customer"
    );
  }
};

export const createSubscriptionPlan = async (
  planData: RazorpayPlanCreateRequestBody
) => {
  try {
    return await razorpay.plans.create(planData);
  } catch (error: unknown) {
    throw new ApiError(400, `Error creating subscription plan`);
  }
};

export const createOrder = async (
  orderData: RazorpayOrderCreateRequestBody
) => {
  try {
    return razorpay.orders.create({
      amount: orderData.amount,
      currency: orderData.currency,
    });
  } catch (error: unknown) {
    throw new ApiError(400, `Error creating order`);
  }
};

export const createSubscription = async (
  subscriptionData: RazorpaySubscriptionCreateRequestBody
) => {
  try {
    return await razorpay.subscriptions.create(subscriptionData);
  } catch (error: unknown) {
    throw new ApiError(400, `Error creating subscription`);
  }
};

export const getSubscriptionDetail = async (subscriptionId: string) => {
  try {
    return await razorpay.subscriptions.fetch(subscriptionId);
  } catch (error: unknown) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Error fetching subscription`);
  }
};

export const cancelSubscription = async (subscriptionId: string) => {
  try {
    return await razorpay.subscriptions.cancel(subscriptionId);
  } catch (error: unknown) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Error cancelling subscription`);
  }
};

export const findOrCreateRPayCustomer = async (
  customerData: RazorpayCustomerCreateRequestBody,
  userId: string
) => {
  try {
    const customers = await razorpay.customers.all();
    let customer;

    if (customers.items.length > 0) {
      customer = customers.items.find((c) => c.email === customerData.email);
      if (customer) return customer;
    }
    customer = await razorpay.customers.create({
      name: customerData.name,
      email: customerData.email,
      contact: customerData.contact,
      fail_existing: 0,
    });

    return customer;
  } catch (error: unknown) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Error finding or creating customer`
    );
  }
};

export const pauseSubscription = async (subscriptionId: string) => {
  try {
    return await razorpay.subscriptions.pause(subscriptionId);
  } catch (error: unknown) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Error pausing subscription`);
  }
};

export const updateSubscription = async (
  subscriptionId: string,
  subscriptionData: Partial<RazorpaySubscriptionCreateRequestBody>
) => {
  try {
    return await razorpay.subscriptions.update(
      subscriptionId,
      subscriptionData
    );
  } catch (error: unknown) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Error updating subscription`);
  }
};

export const resumeSubscription = async (subscriptionId: string) => {
  try {
    return await razorpay.subscriptions.resume(subscriptionId);
  } catch (error: unknown) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Error resuming subscription`);
  }
};
