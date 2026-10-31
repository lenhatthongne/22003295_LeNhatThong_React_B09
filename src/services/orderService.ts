import { api } from "../api/client";
import { Order, OrderItem, PaymentMethod, ShippingAddress } from "../types";

export interface NewOrder {
  userId: number;
  items: OrderItem[];
  total: number;
  address: ShippingAddress;
  paymentMethod: PaymentMethod;
}

// TODO BT9.2: POST /orders — gửi { ...payload, status: "pending", createdAt: new Date().toISOString() }
// Gợi ý: api.post<Order>("/orders", body) rồi return res.data

export async function createOrder(
  payload: NewOrder
): Promise<Order> {
  const res = await api.post<Order>("/orders", {
    ...payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return res.data;
}


// TODO BT9.3: GET /orders?userId=…&_sort=createdAt&_order=desc  (mới nhất lên đầu)

export async function getOrdersByUser(
  userId: number
): Promise<Order[]> {
  const res = await api.get<Order[]>("/orders", {
    params: {
      userId,
      _sort: "createdAt",
      _order: "desc",
    },
  });

  return res.data;
}

