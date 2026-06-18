import React from "react"
import { Search } from "lucide-react"

interface PageToolbarProps {
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  children?: React.ReactNode // Vùng chứa các nút thao tác bên phải
}

export default function PageToolbar({
  searchPlaceholder = "Search...",
  onSearch,
  children,
}: PageToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4">
      
      {/* Thanh tìm kiếm */}
      <div className="relative w-full sm:max-w-[400px]">
        <input
          type="text"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500 text-sm text-gray-700 placeholder:text-gray-400"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>

      {/* Cụm nút hành động bên phải */}
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
      
    </div>
  )
}