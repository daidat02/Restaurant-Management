import React from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  path?: string // Nếu không có path thì nó là trang hiện tại (không click được)
}

interface PageHeaderProps {
  title: string
  breadcrumbs: BreadcrumbItem[]
}

export default function PageHeader({ title, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-1 flex flex-col gap-1.5">
      {/* Tiêu đề trang */}
      {/* <h3 className="text-2xl font-normal text-gray-900">{title}</h3> */}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1

          return (
            <React.Fragment key={item.label}>
              {/* Nếu có link và chưa phải thẻ cuối */}
              {item.path && !isLast ? (
                <Link to={item.path} className="hover:text-gray-900 transition">
                  {item.label}
                </Link>
              ) : (
                /* Thẻ cuối cùng (trang hiện tại) sẽ có màu xanh */
                <span className={isLast ? "text-cerulean-blue-600 font-medium" : ""}>
                  {item.label}
                </span>
              )}

              {/* Icon mũi tên phân cách */}
              {!isLast && <ChevronRight className="h-4 w-4 text-gray-400" />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}