import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { currentUser, clearSession } from "@/components/fashion-data";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Cơ bản");
  const [faceIdEnabled, setFaceIdEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      currentUser().then((value) => {
        if (!value) {
          router.replace("/login" as never);
          return;
        }
        setUser(value);
      });
    }, [router]),
  );

  const rawName = user?.name || user?.TenKhach || user?.TenNhanVien || "Trần Phạm Hà";
  const displayName = typeof rawName === 'string' ? rawName.replace("Super ", "") : rawName;
  const displayEmail = user?.email || user?.Email || "ha.tran@luxholding.vn";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="chevron-left" size={28} color="#181a2e" />
        </Pressable>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerBtn}>
            <MaterialIcons name="share" size={24} color="#455f87" />
          </Pressable>
          <Pressable 
            style={styles.headerBtn}
            onPress={async () => {
              await clearSession();
              router.replace("/login" as never);
            }}
          >
            <MaterialIcons name="logout" size={24} color="#b6152b" />
          </Pressable>
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida/AEtjO1VPJmyPVqAjbC-l0rkFrqmh7zJpks3ge7Tlw3k1u7vROxk3ZkaC1HSTQznCL3kL8C6Dg_FcrOeRsPsVHqn4hXTJ8V37FssBYdyv1x0xIsMc0aFXMb06kuEUI1shjyt-Gya2a5GHI-sdLfhl4Kteq73hyDZJpVpFjeTweqagRLK4q6ODvMpvEuxXcDVhlI78ofPCZV8NMEPkveyjSnu70GZ-KBk9uY1ucE321cxHNoHywYamyf0VixLZwJzU",
            }}
            style={styles.headerAvatar}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Status Bar */}
        <View style={styles.topStatusBar}>
          <View style={styles.topStatusLeft}>
            <MaterialIcons name="verified-user" size={16} color="#455f87" />
            <Text style={styles.topStatusText}>TÀI KHOẢN BẢO MẬT CAO CẤP</Text>
          </View>
          <Pressable style={styles.saveBtnTop}>
            <MaterialIcons name="check" size={16} color="#fff" />
            <Text style={styles.saveBtnTopText}>Lưu</Text>
          </Pressable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida/AEtjO1VPJmyPVqAjbC-l0rkFrqmh7zJpks3ge7Tlw3k1u7vROxk3ZkaC1HSTQznCL3kL8C6Dg_FcrOeRsPsVHqn4hXTJ8V37FssBYdyv1x0xIsMc0aFXMb06kuEUI1shjyt-Gya2a5GHI-sdLfhl4Kteq73hyDZJpVpFjeTweqagRLK4q6ODvMpvEuxXcDVhlI78ofPCZV8NMEPkveyjSnu70GZ-KBk9uY1ucE321cxHNoHywYamyf0VixLZwJzU",
                }}
                style={styles.mainAvatar}
              />
              <Pressable style={styles.cameraBtn}>
                <MaterialIcons name="camera-alt" size={14} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <MaterialIcons name="verified" size={18} color="#b6152b" />
            </View>
            <View style={styles.tagsRow}>
              <View style={styles.vipTag}>
                <MaterialIcons name="diamond" size={12} color="#735c00" />
                <Text style={styles.vipTagText}>Diamond VIP</Text>
              </View>
              <View style={styles.svipTag}>
                <Text style={styles.svipTagText}>SVIP-9901</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <MaterialIcons
                name="workspace-premium"
                size={16}
                color="#735c00"
              />
              <Text style={styles.progressTitle}>Đặc quyền Hạng Kim Cương</Text>
              <Text style={styles.progressPoints}>2.450 / 3.000 pts</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={["#e9c349", "#b6152b"]}
                style={[styles.progressBarFill, { width: "81.6%" }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressDesc}>
                Còn 550 điểm để duy trì quyền lợi Icon VIP 2025
              </Text>
              <MaterialIcons name="chevron-right" size={14} color="#455f87" />
            </View>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {["Cơ bản", "Địa chỉ", "Bảo mật"].map((tab) => {
            const isActive = activeTab === tab;
            let icon = "person";
            if (tab === "Địa chỉ") icon = "location-on";
            if (tab === "Bảo mật") icon = "lock";

            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                <MaterialIcons
                  name={icon as any}
                  size={16}
                  color={isActive ? "#b6152b" : "#455f87"}
                />
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section 1: Thông tin cơ bản */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrapper}>
                <MaterialIcons name="person" size={20} color="#b6152b" />
              </View>
              <Text style={styles.sectionTitle}>Thông tin cá nhân cơ bản</Text>
            </View>
            <Text style={styles.sectionHeaderRightText}>Hồ sơ 100%</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Họ và tên <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={displayName}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>
                Số điện thoại <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="check-circle" size={12} color="#0d8549" />
                <Text style={styles.verifiedText}>Đã xác thực</Text>
              </View>
            </View>
            <View style={styles.inputWithAction}>
              <TextInput
                style={styles.input}
                value="0918.234.567"
                editable={false}
              />
              <Pressable style={styles.inputActionBtn}>
                <Text style={styles.inputActionText}>Thay đổi</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>
                Địa chỉ Email <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="check-circle" size={12} color="#0d8549" />
                <Text style={styles.verifiedText}>Đã xác thực</Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              value={displayEmail}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ngày sinh nhật</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                value="12/12/1992"
                editable={false}
              />
              <MaterialIcons
                name="cake"
                size={20}
                color="#455f87"
                style={styles.inputIcon}
              />
            </View>
            <View style={styles.voucherAlert}>
              <MaterialIcons name="card-giftcard" size={16} color="#b6152b" />
              <Text style={styles.voucherAlertText}>
                Nhận voucher sinh nhật VIP giảm{" "}
                <Text style={styles.boldText}>
                  25% toàn bộ BST haute couture
                </Text>{" "}
                tự động vào ngày 01/12 hàng năm.
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Giới tính</Text>
            <View style={styles.genderOptions}>
              <Pressable style={[styles.genderBtn, styles.genderBtnActive]}>
                <MaterialIcons name="female" size={18} color="#fff" />
                <Text style={[styles.genderText, styles.genderTextActive]}>
                  Nữ
                </Text>
              </Pressable>
              <Pressable style={styles.genderBtn}>
                <MaterialIcons name="male" size={18} color="#455f87" />
                <Text style={styles.genderText}>Nam</Text>
              </Pressable>
              <Pressable style={styles.genderBtn}>
                <Text style={styles.genderText}>Khác</Text>
              </Pressable>
            </View>
          </View>
        </View>



        {/* Section 3: Địa chỉ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.sectionIconWrapper,
                  { backgroundColor: "#fff8e1" },
                ]}
              >
                <MaterialIcons name="location-on" size={20} color="#f57f17" />
              </View>
              <Text style={styles.sectionTitle}>
                Địa chỉ giao hàng mặc định
              </Text>
            </View>
            <View style={styles.mainAddressBadge}>
              <Text style={styles.mainAddressText}>Chính</Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.addressNameInfo}>
              Admin{" "}
              <Text style={styles.addressPhone}>| 0918.234.567</Text>
            </Text>
            <View style={styles.addressLocationRow}>
              <MaterialIcons name="business" size={16} color="#455f87" />
              <Text style={styles.addressLocationText}>
                Căn hộ 42.08, Tháp Landmark 81, P. 22, Q. Bình Thạnh, TP. Hồ Chí
                Minh
              </Text>
            </View>
          </View>

          <View style={styles.addressFooter}>
            <Pressable style={styles.manageAddressBtn}>
              <Text style={styles.manageAddressText}>
                Quản lý sổ địa chỉ (8 địa chỉ)
              </Text>
              <MaterialIcons name="chevron-right" size={16} color="#455f87" />
            </Pressable>
            <Pressable>
              <Text style={styles.editAddressText}>Chỉnh sửa</Text>
            </Pressable>
          </View>
        </View>

        {/* Section 4: Bảo mật */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.sectionIconWrapper,
                  { backgroundColor: "#ffebee" },
                ]}
              >
                <MaterialIcons name="vpn-key" size={20} color="#b6152b" />
              </View>
              <Text style={styles.sectionTitle}>Đổi mật khẩu & Bảo mật</Text>
            </View>
            <MaterialIcons name="security" size={20} color="#0d8549" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                value="••••••••••••"
                secureTextEntry
                editable={false}
              />
              <MaterialIcons
                name="visibility"
                size={20}
                color="#455f87"
                style={styles.inputIcon}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="Nhập ít nhất 8 ký tự"
                secureTextEntry
              />
              <MaterialIcons
                name="visibility-off"
                size={20}
                color="#455f87"
                style={styles.inputIcon}
              />
            </View>



          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
              />
              <MaterialIcons
                name="visibility-off"
                size={20}
                color="#455f87"
                style={styles.inputIcon}
              />
            </View>
          </View>


        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable style={styles.updateBtn}>
            <MaterialIcons name="save" size={20} color="#fff" />
            <Text style={styles.updateBtnText}>Cập nhật hồ sơ</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Hủy thay đổi & Quay lại</Text>
          </Pressable>
        </View>

        <View style={styles.footerNote}>
          <MaterialIcons name="lock" size={14} color="#0d8549" />
          <Text style={styles.footerNoteText}>
            FashionHeaven bảo mật 100% dữ liệu cá nhân theo tiêu chuẩn{" "}
            <Text style={styles.boldText}>ISO/IEC 27001</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    backgroundColor: "#fff",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: "600",
    color: "#181a2e",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },

  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },

  topStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  topStatusLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  topStatusText: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "600",
    color: "#455f87",
  },
  saveBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#b6152b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveBtnTopText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarSection: { alignItems: "center", marginBottom: 16 },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  mainAvatar: { width: 80, height: 80, borderRadius: 40 },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#b6152b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  profileName: {
    fontFamily: "Inter",
    fontSize: 20,
    fontWeight: "700",
    color: "#181a2e",
  },
  tagsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  vipTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff8e1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vipTagText: { fontSize: 11, fontWeight: "700", color: "#735c00" },
  svipTag: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  svipTagText: { fontSize: 11, fontWeight: "600", color: "#4f46e5" },

  progressSection: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
  },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  progressTitle: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600",
    color: "#455f87",
    marginLeft: 6,
  },
  progressPoints: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "500",
    color: "#735c00",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 2 },
  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressDesc: { fontFamily: "Inter", fontSize: 11, color: "#64748b" },

  tabsContainer: { marginBottom: 16 },
  tabsContent: { gap: 8 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#eef2ff",
    borderRadius: 20,
  },
  tabBtnActive: { backgroundColor: "#ffebee" },
  tabText: {
    fontFamily: "Inter",
    fontSize: 13,
    fontWeight: "600",
    color: "#455f87",
  },
  tabTextActive: { color: "#b6152b" },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffebee",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
    color: "#181a2e",
  },
  sectionSubtitle: {
    fontFamily: "Inter",
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  sectionHeaderRightText: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "600",
    color: "#455f87",
  },
  recommendBadge: {
    backgroundColor: "#fff8e1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendBadgeText: { fontSize: 10, fontWeight: "700", color: "#d84315" },
  mainAddressBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mainAddressText: { fontSize: 10, fontWeight: "600", color: "#4f46e5" },

  inputGroup: { marginBottom: 16 },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  inputLabel: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "500",
    color: "#455f87",
    marginBottom: 6,
  },
  required: { color: "#b6152b" },
  input: {
    backgroundColor: "#f8f9fa",
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: "Inter",
    fontSize: 14,
    color: "#181a2e",
  },
  inputWithAction: { position: "relative", justifyContent: "center" },
  inputActionBtn: { position: "absolute", right: 12 },
  inputActionText: {
    fontFamily: "Inter",
    fontSize: 13,
    fontWeight: "600",
    color: "#4f46e5",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e6f4ea",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: { fontSize: 10, fontWeight: "600", color: "#0d8549" },
  inputWithIcon: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", right: 12 },

  voucherAlert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fff5f5",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  voucherAlertText: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 11,
    color: "#b6152b",
    lineHeight: 16,
  },
  boldText: { fontWeight: "700" },

  genderOptions: { flexDirection: "row", gap: 8 },
  genderBtn: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  genderBtnActive: { backgroundColor: "#b6152b" },
  genderText: {
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "500",
    color: "#181a2e",
  },
  genderTextActive: { color: "#fff" },

  measurementsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  measurementBox: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  measurementLabel: {
    fontFamily: "Inter",
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  measurementValue: {
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: "700",
    color: "#181a2e",
  },
  measurementUnit: { fontSize: 12, fontWeight: "500", color: "#64748b" },

  threeSizesContainer: { marginBottom: 16 },
  threeSizesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  threeSizesTitle: {
    fontFamily: "Inter",
    fontSize: 13,
    fontWeight: "600",
    color: "#181a2e",
  },
  threeSizesSuggest: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "600",
    color: "#b6152b",
  },
  threeSizesBoxes: { flexDirection: "row", gap: 8 },
  sizeBox: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  sizeBoxLabel: {
    fontFamily: "Inter",
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  sizeBoxValue: {
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
    color: "#181a2e",
  },
  sizeBoxUnit: { fontSize: 11, fontWeight: "500", color: "#64748b" },

  styleTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  styleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  styleTagText: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "500",
    color: "#4f46e5",
  },
  styleTagAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  styleTagAddText: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "500",
    color: "#455f87",
  },

  addressBox: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  addressNameInfo: {
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "600",
    color: "#181a2e",
    marginBottom: 8,
  },
  addressPhone: { fontWeight: "400", color: "#64748b" },
  addressLocationRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  addressLocationText: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 13,
    color: "#455f87",
    lineHeight: 20,
  },
  addressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  manageAddressBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  manageAddressText: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600",
    color: "#455f87",
  },
  editAddressText: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600",
    color: "#b6152b",
  },

  passwordStrength: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 6,
  },
  strengthLabel: { fontFamily: "Inter", fontSize: 11, color: "#64748b" },
  strengthRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  strengthValue: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "600",
    color: "#0d8549",
  },
  strengthBars: { flexDirection: "row", gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },

  biometricBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  biometricLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  biometricIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  biometricTitle: {
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "600",
    color: "#181a2e",
    marginBottom: 2,
  },
  biometricDesc: { fontFamily: "Inter", fontSize: 11, color: "#64748b" },

  actionsContainer: { gap: 12, marginBottom: 24 },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#b6152b",
    height: 48,
    borderRadius: 24,
  },
  updateBtnText: {
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    backgroundColor: "#eef2ff",
    borderRadius: 24,
  },
  cancelBtnText: {
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "600",
    color: "#4f46e5",
  },

  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  footerNoteText: {
    fontFamily: "Inter",
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
  },
});
