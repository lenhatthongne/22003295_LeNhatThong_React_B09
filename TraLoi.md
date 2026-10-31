
# BÀI THỰC HÀNH BUỔI 9 - BOOKSTORE

## PHẦN 3: TRẢ LỜI CÂU HỎI BỔ SUNG

### Câu 1. Giá trị dẫn xuất

Trong Checkout, errors và valid được tính trực tiếp từ state
(name, phone, address và items) để luôn phản ánh dữ liệu mới
nhất mỗi khi component render.

Nếu sử dụng useState riêng, lập trình viên phải cập nhật lỗi
và trạng thái hợp lệ sau mỗi lần thay đổi dữ liệu. Điều này
dễ dẫn đến tình trạng thông tin đã thay đổi nhưng nút xác
nhận vẫn hiển thị trạng thái cũ.

### Câu 2. Thứ tự gọi

Nếu clear() được gọi trước await createOrder(), giỏ hàng
sẽ bị xóa ngay cả khi API thất bại do mất mạng hoặc
server không hoạt động.

Đặt clear() ngay sau khi createOrder() thành công sẽ
đảm bảo đơn hàng được lưu trước khi xóa giỏ, tránh
làm mất các sản phẩm người dùng đã chọn.

### Câu 3. PUT hay PATCH

PUT thường được sử dụng để thay thế toàn bộ tài nguyên.
Nếu gửi PUT /users/1 chỉ với name và phone, các trường
không được gửi như email và password có thể bị mất.

PATCH chỉ cập nhật những trường được gửi trong request.
Vì vậy, bài thực hành sử dụng PATCH để sửa tên và số
điện thoại mà không ảnh hưởng các thông tin khác.

### Câu 4. Cập nhật lạc quan

Nếu không hoàn lại read: false khi API bị lỗi, giao diện
vẫn hiển thị thông báo đã đọc trong khi server thực tế
chưa cập nhật, gây sai lệch trạng thái.

Chức năng thêm hoặc bỏ yêu thích có thể sử dụng cập
nhật lạc quan để phản hồi nhanh hơn. Tuy nhiên, thanh
toán và đặt hàng không nên báo thành công trước khi
server xác nhận vì có nguy cơ sai lệch giao dịch.

### Câu 5. Bộ lọc trạng thái đơn hàng

Đã bổ sung bộ lọc trạng thái trong OrdersScreen.tsx
bằng useState và Array.filter().

Các trạng thái bao gồm:
- Tất cả
- Chờ xác nhận
- Đang giao
- Hoàn tất
- Đã hủy

Code xử lý:

const [statusFilter, setStatusFilter] = useState<
  "all" | Order["status"]
>("all");

const filteredOrders = orders.filter(
  (order) =>
    statusFilter === "all" ||
    order.status === statusFilter
);

Trong FlatList, thay data={orders} bằng:

data={filteredOrders}

Khi chọn trạng thái, danh sách đơn hàng tự động cập nhật
mà không cần gọi lại API.

Minh chứng: Ảnh chụp màn hình Đơn hàng của tôi
với bộ lọc trạng thái.

---

## PHẦN THỬ THÁCH CỘNG ĐIỂM

### BT9.C1 - Chức năng Mua lại

Đã bổ sung chức năng Mua lại tại OrdersScreen.tsx.

Chức năng chỉ áp dụng cho đơn hàng có trạng thái completed.

Khi mua lại, ứng dụng lấy thông tin sách mới nhất bằng
getBooks(), cập nhật giá bán hiện tại, cộng số lượng
sản phẩm nếu sách đã có trong giỏ và giới hạn số lượng
theo tồn kho.

Sau khi thêm sản phẩm, ứng dụng chuyển người dùng
đến tab Giỏ hàng.

Minh chứng: Ảnh đơn hàng Hoàn tất có nút Mua lại
và ảnh Giỏ hàng sau khi thực hiện.

---

## PHẦN CHƯA HOÀN THÀNH

Không có nội dung chưa hoàn thành sau khi tất cả
các chức năng đã được kiểm thử thành công.
