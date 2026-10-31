
import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import { Header } from "../components/Header";
import { FormField } from "../components/FormField";
import { PrimaryButton } from "../components/PrimaryButton";

import { updateProfile } from "../services/userService";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../store/hooks";
import { showMessage } from "../utils/dialog";

import {
  validatePhone,
  validateRequired,
} from "../utils/validators";

import { RootScreenProps } from "../navigation/types";
import { colors } from "../theme";

export function EditProfileScreen({
  navigation,
}: RootScreenProps<"EditProfile">) {

  const { user, patchUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  // ==========================================
  // BÀI 9.4a - VALIDATE THÔNG TIN
  // ==========================================

  const errors = {
    name: validateRequired("họ tên")(name),
    phone: validatePhone(phone),
  };

  // ==========================================
  // BÀI 9.4b - LƯU THÔNG TIN BẰNG PATCH
  // ==========================================

  const save = async () => {
    setTouched(true);

    if (errors.name || errors.phone || !user) {
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const updated = await updateProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
      });

      patchUser(updated);

      // MINH CHỨNG BT9.4 - LƯU THÀNH CÔNG
      showMessage(
        "Đã lưu",
        "Thông tin hồ sơ đã được cập nhật.",
        () => navigation.goBack()
      );

    } catch (e) {
      setSubmitError(getErrorMessage(e));

    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>

      {/* NÚT QUAY LẠI - BÀI 9.4 */}
      <Header
        title="Chỉnh sửa hồ sơ"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* Email không cho chỉnh sửa */}
        <FormField
          label="Email (không thể sửa)"
          value={user?.email ?? ""}
          editable={false}
          style={{ opacity: 0.6 }}
        />

        {/* MINH CHỨNG BT9.4 - VALIDATE */}
        {/* Xóa họ tên, bấm Lưu để chụp lỗi */}

        <FormField
          label="Họ tên"
          value={name}
          onChangeText={setName}
          error={touched ? errors.name : null}
          autoCapitalize="words"
        />

        <FormField
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          error={touched ? errors.phone : null}
          keyboardType="phone-pad"
        />

        {submitError ? (
          <Text style={styles.error}>
            {submitError}
          </Text>
        ) : null}

        <PrimaryButton
          title="Lưu thay đổi"
          onPress={save}
          loading={loading}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    gap: 14,
  },

  error: {
    color: colors.danger,
    textAlign: "center",
  },
});
