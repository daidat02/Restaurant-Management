import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Cuộn mượt mà lên đầu trang mỗi khi đường dẫn URL thay đổi
    window.scrollTo({
      top: 0,
      behavior: "instant", // Hoặc dùng "smooth" nếu muốn hiệu ứng cuộn từ từ
    })
  }, [pathname])

  return null // Component này chỉ chạy logic ngầm, không cần render giao diện
}