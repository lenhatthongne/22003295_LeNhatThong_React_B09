
import { api } from "../api/client";
import { AppNotification } from "../types";

/**
 * BÀI 9.5a - LẤY DANH SÁCH THÔNG BÁO
 *
 * Lọc thông báo theo userId.
 * Sắp xếp từ mới nhất đến cũ nhất.
 */
export async function getNotifications(
  userId: number
): Promise<AppNotification[]> {

  const response = await api.get<AppNotification[]>(
    "/notifications",
    {
      params: {
        userId,
        _sort: "createdAt",
        _order: "desc",
      },
    }
  );

  return response.data;
}

/**
 * BÀI 9.5b - ĐÁNH DẤU ĐÃ ĐỌC
 *
 * PATCH /notifications/:id
 */
export async function markAsRead(
  id: number
): Promise<AppNotification> {

  const response = await api.patch<AppNotification>(
    `/notifications/${id}`,
    {
      read: true,
    }
  );

  return response.data;
}
