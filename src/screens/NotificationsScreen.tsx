
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  StyleSheet,
  View,
} from "react-native";

import { NotificationItem } from "../components/NotificationItem";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";

import {
  getNotifications,
  markAsRead,
} from "../services/notificationService";

import { getErrorMessage } from "../api/client";
import { useAuth } from "../store/hooks";

import { RootScreenProps } from "../navigation/types";
import { AppNotification } from "../types";
import { colors } from "../theme";

export function NotificationsScreen({
  navigation,
}: RootScreenProps<"Notifications">) {

  const { user, isLoggedIn } = useAuth();

  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================
  // BÀI 9.5c - TẢI THÔNG BÁO TỪ API
  // ==========================================

  const load = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getNotifications(user.id);

      const sorted = [...result].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );

      setData(sorted);

    } catch (e) {
      setError(getErrorMessage(e));

    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // QUAN TRỌNG: Gọi API khi mở màn hình
  useEffect(() => {
    void load();
  }, [load]);

  // ==========================================
  // BÀI 9.5d - CẬP NHẬT LẠC QUAN
  // ==========================================

  const open = async (n: AppNotification) => {

    if (!n.read) {

      // MINH CHỨNG BT9.5 - CHƯA ĐỌC
      // Trước khi bấm: nền xanh nhạt, chấm đỏ

      // Đổi giao diện ngay
      setData((prev) =>
        prev.map((item) =>
          item.id === n.id
            ? { ...item, read: true }
            : item
        )
      );

      // Gửi thay đổi lên API.
      // Nếu API lỗi thì hoàn lại trạng thái cũ.
      void markAsRead(n.id).catch(() => {
        setData((prev) =>
          prev.map((item) =>
            item.id === n.id
              ? { ...item, read: false }
              : item
          )
        );
      });
    }

    // ========================================
    // ĐIỀU HƯỚNG THEO LOẠI THÔNG BÁO
    // ========================================

    if (n.target?.screen === "Orders") {
      navigation.navigate("Orders");

    } else if (
      n.target?.screen === "BookDetail" &&
      n.target.bookId !== undefined
    ) {
      navigation.navigate("BookDetail", {
        bookId: n.target.bookId,
      });
    }

    // MINH CHỨNG BT9.5 - ĐÃ ĐỌC
    // Quay lại màn này và chụp nền trắng.
  };

  // ==========================================
  // KIỂM TRA ĐĂNG NHẬP
  // ==========================================

  if (!isLoggedIn) {
    return (
      <EmptyState
        emoji="🔒"
        title="Bạn cần đăng nhập"
        actionLabel="Đăng nhập"
        onAction={() =>
          navigation.navigate("Login")
        }
      />
    );
  }

  if (loading) {
    return <LoadingView />;
  }

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={load}
      />
    );
  }

  // ==========================================
  // BÀI 9.5e - DANH SÁCH THÔNG BÁO
  // ==========================================

  return (
    <View style={styles.container}>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}

        contentContainerStyle={styles.list}

        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={open}
          />
        )}

        ListEmptyComponent={
          <EmptyState
            emoji="🔔"
            title="Chưa có thông báo nào"
          />
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 12,
  },

  list: {
    gap: 8,
    flexGrow: 1,
    paddingBottom: 24,
  },
});
