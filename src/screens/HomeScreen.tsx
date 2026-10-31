
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Header } from "../components/Header";
import { SearchBar } from "../components/SearchBar";
import { CategoryChips } from "../components/CategoryChips";
import { PriceFilter } from "../components/PriceFilter";
import { BookGrid } from "../components/BookGrid";
import { FloatingCartButton } from "../components/FloatingCartButton";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";

import { getBooks } from "../services/bookService";
import { getCategories } from "../services/categoryService";
import { getErrorMessage } from "../api/client";
import { showMessage } from "../utils/dialog";

import { useDebounce } from "../hooks/useDebounce";
import { useCart } from "../store/hooks";
import { filterBooks, PriceRange } from "../utils/filters";
import { TabScreenProps } from "../navigation/types";
import { Book, Category } from "../types";
import { colors } from "../theme";

export function HomeScreen({
  navigation,
  route,
}: TabScreenProps<"Home">) {

  const { totalQuantity } = useCart();

  // ==========================================
  // DỮ LIỆU TỪ API
  // ==========================================

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // BÀI 9.6 - STATE REFRESH
  const [refreshing, setRefreshing] = useState(false);

  // ==========================================
  // BỘ LỌC SÁCH
  // ==========================================

  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const [categoryId, setCategoryId] =
    useState<number | null>(null);

  const [priceRange, setPriceRange] =
    useState<PriceRange>(null);

  const debouncedKeyword = useDebounce(keyword, 400);

  // ==========================================
  // TẢI DỮ LIỆU BAN ĐẦU
  // ==========================================

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [bookList, categoryList] = await Promise.all([
        getBooks(),
        getCategories(),
      ]);

      setBooks(bookList);
      setCategories(categoryList);

    } catch (e) {
      setError(getErrorMessage(e));

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ==========================================
  // BÀI 9.6 - KÉO ĐỂ LÀM MỚI
  // ==========================================

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Lấy lại dữ liệu từ API
      const [bookList, categoryList] = await Promise.all([
        getBooks(),
        getCategories(),
      ]);

      // Cập nhật danh sách nhưng không làm mất
      // giao diện trong lúc tải.
      setBooks(bookList);
      setCategories(categoryList);

      // MINH CHỨNG BT9.6 - REFRESH THÀNH CÔNG
      // Đổi giá sách trong db.json, kéo xuống,
      // sau đó chụp giá mới trên Home.

    } catch (e) {
      // MINH CHỨNG BT9.6 - LỖI MẠNG
      // Tắt API rồi kéo xuống để thấy thông báo.
      showMessage(
        "Không thể làm mới",
        getErrorMessage(e)
      );

    } finally {
      setRefreshing(false);
    }
  }, []);

  // ==========================================
  // NHẬN DANH MỤC TỪ TAB CATEGORIES
  // ==========================================

  useEffect(() => {
    const id = route.params?.categoryId;

    if (id !== undefined) {
      setCategoryId(id);

      navigation.setParams({
        categoryId: undefined,
      });
    }
  }, [route.params?.categoryId, navigation]);

  // ==========================================
  // LỌC DANH SÁCH SÁCH
  // ==========================================

  const visibleBooks = useMemo(
    () =>
      filterBooks(books, {
        keyword: debouncedKeyword,
        categoryId,
        priceRange,
      }),
    [
      books,
      debouncedKeyword,
      categoryId,
      priceRange,
    ]
  );

  const hasFilter =
    keyword !== "" ||
    categoryId !== null ||
    priceRange !== null;

  const clearFilters = () => {
    setKeyword("");
    setCategoryId(null);
    setPriceRange(null);
  };

  // ==========================================
  // HEADER BỘ LỌC
  // ==========================================

  const header = (
    <View>
      <CategoryChips
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />

      <PriceFilter
        value={priceRange}
        onChange={setPriceRange}
      />

      {hasFilter && (
        <Pressable
          onPress={clearFilters}
          style={styles.clearBtn}
        >
          <Text style={styles.clearText}>
            ✕ Xóa bộ lọc
          </Text>
        </Pressable>
      )}
    </View>
  );

  // ==========================================
  // GIAO DIỆN HOME
  // ==========================================

  return (
    <View style={styles.container}>

      <Header
        title="📚 BookStore"
        onSearchPress={() =>
          setSearchOpen((v) => !v)
        }
      />

      {searchOpen && (
        <SearchBar
          value={keyword}
          onChangeText={setKeyword}
          onClose={() => {
            setSearchOpen(false);
            setKeyword("");
          }}
        />
      )}

      {loading ? (

        <LoadingView label="Đang tải sách…" />

      ) : error ? (

        <ErrorView
          message={error}
          onRetry={load}
        />

      ) : (

        <BookGrid
          data={visibleBooks}

          // BÀI 9.6 - REFRESH CONTROL
          refreshing={refreshing}
          onRefresh={onRefresh}

          onPressBook={(book) =>
            navigation.navigate("BookDetail", {
              bookId: book.id,
            })
          }

          ListHeaderComponent={header}

          ListEmptyComponent={
            <EmptyState
              emoji="🔎"
              title="Không tìm thấy sách phù hợp"
              message="Hãy thử từ khoá khác hoặc bỏ bớt bộ lọc."
              actionLabel="Xóa bộ lọc"
              onAction={clearFilters}
            />
          }
        />
      )}

      <FloatingCartButton
        count={totalQuantity}
        onPress={() =>
          navigation.navigate("Cart")
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  clearBtn: {
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },

  clearText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 12,
  },
});
