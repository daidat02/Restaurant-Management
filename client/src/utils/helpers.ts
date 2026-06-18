/**
 * Trích xuất ID từ một trường dữ liệu (hỗ trợ cả trường hợp đã populate và chưa populate)
 * @param field Giá trị cần kiểm tra (ví dụ: table.currentOrder, order.table)
 * @param keyName Tên trường ID muốn lấy nếu nó là object (mặc định là '_id')
 * @returns Chuỗi ID, hoặc chuỗi rỗng "" nếu dữ liệu không tồn tại
 */
export const extractId = (field: any, keyName: string = '_id'): string => {
  if (!field) return ''; // Trả về "" nếu null/undefined

  if (typeof field === 'object') {
    // Nếu là Object (đã populate), ưu tiên lấy theo keyName truyền vào,
    // nếu không có thì fallback thử lấy _id hoặc orderId
    return field[keyName] || field._id || field.orderId || '';
  }

  // Nếu không phải Object (tức là nó đang ở dạng chuỗi ObjectId do chưa populate)
  return String(field);
};

// Hàm tính khoảng thời gian trôi qua
export const getTimeAgo = (dateString: Date | string) => {
  if (!dateString) return '';

  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ngày trước`;
};

export const generateTimeSlots = (openHours: string, closeHours: string): string[] => {
  const slots: string[] = [];

  // Chuyển đổi "HH:MM" thành số phút tổng để dễ tính toán vòng lặp
  const [openH, openM] = openHours.split(':').map(Number);
  const [closeH, closeM] = closeHours.split(':').map(Number);

  let currentMinutes = openH * 60 + openM;
  const endMinutes = closeH * 60 + closeM;

  // Chạy vòng lặp, mỗi bước cộng thêm 30 phút
  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;

    // Format lại định dạng HH:MM (ví dụ: 9 -> "09", 0 -> "00")
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    slots.push(formattedTime);

    currentMinutes += 30; // Bước nhảy 30 phút
  }

  return slots;
};

export const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};
