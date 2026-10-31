
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusBadge } from "../components/StatusBadge";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";

import { getOrdersByUser } from "../services/orderService";
import { getBooks } from "../services/bookService";
import { getErrorMessage } from "../api/client";

import { useAuth, useCart } from "../store/hooks";
import { formatDateTime } from "../utils/format";
import { showMessage } from "../utils/dialog";

import { RootScreenProps } from "../navigation/types";
import { Order, OrderStatus } from "../types";
import { colors, formatPrice, radius } from "../theme";

export const PAYMENT_LABEL = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank: "Chuyển khoản ngân hàng",
} as const;

// CÂU 5 - Các lựa chọn lọc trạng thái
type StatusFilter = "all" | OrderStatus;

const STATUS_FILTERS: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

export function OrdersScreen({
  navigation,
}: RootScreenProps<"Orders">) {
  const { user, isLoggedIn } = useAuth();

  const {
    items: cartItems,
    add,
    remove,
    setQty,
  } = useCart();

  // ==========================================
  // BÀI 9.3 - STATE ĐƠN HÀNG
  // ==========================================

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  // ==========================================
  // CÂU HỎI BỔ SUNG SỐ 5 - BỘ LỌC TRẠNG THÁI
  // ==========================================

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const filteredOrders = orders.filter(
    (order) =>
      statusFilter === "all" ||
      order.status === statusFilter
  );

  // ==========================================
  // BT9.C1 - TRẠNG THÁI ĐANG MUA LẠI
  // ==========================================

  const [reorderingId, setReorderingId] =
    useState<number | null>(null);

  // ==========================================
  // BÀI 9.3a - TẢI DANH SÁCH ĐƠN HÀNG
  // ==========================================

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getOrdersByUser(user.id);

      const sortedOrders = [...result].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt)
      );

      setOrders(sortedOrders);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Gọi API khi mở màn hình
  useEffect(() => {
    if (isLoggedIn) {
      void load();
    }
  }, [isLoggedIn, load]);

  // ==========================================
  // BT9.C1 - CHỨC NĂNG MUA LẠI
  // ==========================================

  const reorder = async (order: Order) => {
    // Chỉ cho mua lại đơn hoàn tất
    if (
      order.status !== "completed" ||
      reorderingId !== null
    ) {
      return;
    }

    setReorderingId(order.id);

    try {
      // Lấy dữ liệu sách mới nhất từ API
      const latestBooks = await getBooks();

      // Gom những dòng sách trùng trong đơn
      const quantities = new Map<number, number>();

      for (const item of order.items) {
        quantities.set(
          item.bookId,
          (quantities.get(item.bookId) ?? 0) +
            item.quantity
        );
      }

      // Chuẩn bị dữ liệu trước khi sửa giỏ hàng
      const updates: {
        bookId: number;
        title: string;
        price: number;
        emoji: string;
        color: string;
        stock: number;
        quantity: number;
        existed: boolean;
      }[] = [];

      let skipped = 0;
      let capped = 0;

      for (const [bookId, quantity] of quantities) {
        const book = latestBooks.find(
          (b) => b.id === bookId
        );

        // Không có sách hoặc đã hết hàng
        if (!book || book.stock <= 0) {
          skipped++;
          continue;
        }

        const existing = cartItems.find(
          (item) => item.bookId === bookId
        );

        const currentQuantity =
          existing?.quantity ?? 0;

        // Chỉ cộng số lượng tối đa tới tồn kho
        const newQuantity = Math.min(
          book.stock,
          currentQuantity + quantity
        );

        if (newQuantity < currentQuantity + quantity) {
          capped++;
        }

        if (newQuantity <= 0) {
          skipped++;
          continue;
        }

        updates.push({
          bookId: book.id,
          title: book.title,
          price: book.price,
          emoji: book.emoji,
          color: book.color,
          stock: book.stock,
          quantity: newQuantity,
          existed: !!existing,
        });
      }

      if (updates.length === 0) {
        showMessage(
          "Không thể mua lại",
          "Các sách trong đơn hiện đã hết hàng hoặc không còn bán."
        );
        return;
      }

      // Cập nhật các sản phẩm trong Redux Cart
      for (const item of updates) {
        // Xóa dòng cũ nếu sách đã có trong giỏ,
        // để làm mới cả giá và tồn kho
        if (item.existed) {
          remove(item.bookId);
        }

        add({
          bookId: item.bookId,
          title: item.title,
          price: item.price,
          emoji: item.emoji,
          color: item.color,
          stock: item.stock,
        });

        setQty(item.bookId, item.quantity);
      }

      // MINH CHUNG BT9.C1
      // Chụp ảnh giỏ hàng sau khi bấm Mua lại

      let message = "Đã cập nhật giỏ hàng bằng giá mới nhất.";

      if (skipped > 0) {
        message += ` Có ${skipped} sách hết hàng hoặc không còn bán.`;
      }

      if (capped > 0) {
        message += ` Có ${capped} sách đã giới hạn số lượng theo tồn kho.`;
      }

      showMessage(
        "Mua lại thành công 🎉",
        message,
        () =>
          navigation.navigate("Tabs", {
            screen: "Cart",
          })
      );
    } catch (e) {
      showMessage(
        "Không thể mua lại",
        getErrorMessage(e)
      );
    } finally {
      setReorderingId(null);
    }
  };

  // ==========================================
  // KIỂM TRA ĐĂNG NHẬP / LOADING / ERROR
  // ==========================================

  if (!isLoggedIn) {
    return (
      <EmptyState
        emoji="🔒"
        title="Bạn cần đăng nhập"
        actionLabel="Đăng nhập"
        onAction={() => navigation.navigate("Login")}
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
  // GIAO DIỆN ĐƠN HÀNG
  // ==========================================

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(order) => String(order.id)}
        contentContainerStyle={styles.list}

        // Không đặt comment // ở giữa props JSX

        ListHeaderComponent={
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>
              Lọc theo trạng thái
            </Text>

            {/* MINH CHUNG CAU 5 - BO LOC */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {STATUS_FILTERS.map((filter) => {
                const selected =
                  statusFilter === filter.value;

                return (
                  <Pressable
                    key={filter.value}
                    onPress={() => {
                      setStatusFilter(filter.value);
                      setOpenId(null);
                    }}
                    style={[
                      styles.filterButton,
                      selected && styles.filterButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected && styles.filterTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }

        renderItem={({ item: order }) => {
          const isOpen = openId === order.id;

          return (
            <View style={styles.card}>
              <Pressable
                onPress={() =>
                  setOpenId(
                    isOpen ? null : order.id
                  )
                }
                style={styles.cardHeader}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>
                    Đơn #{order.id}
                  </Text>

                  <Text style={styles.date}>
                    {formatDateTime(order.createdAt)}
                  </Text>

                  <Text style={styles.total}>
                    {formatPrice(order.total)}
                  </Text>
                </View>

                <View style={styles.statusArea}>
                  <StatusBadge status={order.status} />

                  <Text style={styles.detailLabel}>
                    Chi tiết {isOpen ? "▲" : "▼"}
                  </Text>
                </View>
              </Pressable>

              {isOpen && (
                <View style={styles.detailContainer}>
                  <Text style={styles.sectionTitle}>
                    Sản phẩm
                  </Text>

                  {order.items.map((item, index) => (
                    <View
                      key={`${item.bookId}-${index}`}
                      style={styles.productRow}
                    >
                      <Text style={styles.productName}>
                        {item.title} × {item.quantity}
                      </Text>

                      <Text style={styles.productPrice}>
                        {formatPrice(
                          item.price * item.quantity
                        )}
                      </Text>
                    </View>
                  ))}

                  <Text style={styles.sectionTitle}>
                    Giao đến
                  </Text>

                  <Text style={styles.infoText}>
                    {order.address.name}
                  </Text>

                  <Text style={styles.infoText}>
                    {order.address.phone}
                  </Text>

                  <Text style={styles.infoText}>
                    {order.address.address}
                  </Text>

                  <Text style={styles.sectionTitle}>
                    Phương thức thanh toán
                  </Text>

                  <Text style={styles.infoText}>
                    {PAYMENT_LABEL[order.paymentMethod]}
                  </Text>

                  {/* BT9.C1 - NÚT MUA LẠI */}
                  {/* Chỉ hiện ở đơn hoàn tất */}

                  {order.status === "completed" && (
                    <PrimaryButton
                      title="🛒 Mua lại"
                      loading={
                        reorderingId === order.id
                      }
                      disabled={
                        reorderingId !== null
                      }
                      onPress={() => {
                        void reorder(order);
                      }}
                    />
                  )}

                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setOpenId(null)}
                  >
                    <Text style={styles.closeButtonText}>
                      Thu gọn
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}

        ListEmptyComponent={
          orders.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title="Bạn chưa có đơn hàng nào"
              actionLabel="Mua sắm ngay"
              onAction={() =>
                navigation.navigate("Tabs", {
                  screen: "Home",
                })
              }
            />
          ) : (
            <EmptyState
              emoji="🔎"
              title="Không có đơn hàng phù hợp"
              actionLabel="Xem tất cả"
              onAction={() => setStatusFilter("all")}
            />
          )
        }
      />
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 12,
  },

  list: {
    gap: 10,
    paddingBottom: 24,
    flexGrow: 1,
  },

  filterSection: {
    marginBottom: 8,
    gap: 10,
  },

  filterTitle: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 14,
  },

  filterRow: {
    gap: 8,
    paddingVertical: 4,
  },

  filterButton: {
    borderWidth: 1,
    borderColor: colors.indigo,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },

  filterButtonActive: {
    backgroundColor: colors.indigo,
  },

  filterText: {
    color: colors.indigo,
    fontWeight: "700",
    fontSize: 13,
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderInfo: {
    flex: 1,
    gap: 6,
  },

  orderId: {
    fontWeight: "800",
    color: colors.navy,
    fontSize: 16,
  },

  date: {
    color: colors.muted,
    fontSize: 13,
  },

  total: {
    fontWeight: "800",
    color: colors.indigo,
    fontSize: 15,
  },

  statusArea: {
    alignItems: "flex-end",
    gap: 8,
  },

  detailLabel: {
    color: colors.muted,
    fontSize: 13,
  },

  detailContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    gap: 10,
  },

  sectionTitle: {
    fontWeight: "800",
    color: colors.navy,
    fontSize: 14,
  },

  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  productName: {
    flex: 1,
    color: colors.text,
  },

  productPrice: {
    color: colors.text,
    fontWeight: "600",
  },

  infoText: {
    color: colors.text,
    fontSize: 14,
  },

  closeButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 10,
    alignItems: "center",
    marginTop: 5,
  },

  closeButtonText: {
    color: colors.navy,
    fontWeight: "700",
  },
});
