
import { api } from "../api/client";
import { User } from "../types";

/**
 * BÀI 9.4 - CẬP NHẬT HỒ SƠ
 *
 * PATCH chỉ cập nhật name và phone.
 * Không gửi email hoặc password.
 */
export async function updateProfile(
  id: number,
  data: Pick<User, "name" | "phone">
): Promise<User> {
  const response = await api.patch<User & {
    password?: string;
  }>(`/users/${id}`, data);

  // Không đưa mật khẩu từ API vào Redux store
  const { password: _password, ...safeUser } = response.data;

  return safeUser;
}
