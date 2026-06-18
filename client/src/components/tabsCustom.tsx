import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  count?: number; 
  icon?: React.ReactNode,
  className?:string,
}

interface CustomTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
  showChevron?:boolean

}

export const CustomTabs = ({ tabs, activeTab, onTabChange, className ,tabClassName,showChevron= true }: CustomTabsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tabs]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 250;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={cn("relative flex w-full items-center group", className)}>
      
      {canScrollLeft && showChevron && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 flex h-full w-12 items-center justify-start bg-gradient-to-r from-white via-white to-transparent px-1"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </div>
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex w-full items-center overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                // Thêm flex-1 ở đây để các tab chia đều không gian trống
                "flex flex-1 items-center justify-center shrink-0 whitespace-nowrap rounded-lg px-4 py-1.5 text-xs transition-all duration-200",
                tabClassName,
                isActive
                  ? "bg-[#E6F0FD] font-semibold text-blue-600 shadow-sm"
                  : "font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                  tab.className 
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                 <span className="ml-1">({tab.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {canScrollRight && showChevron && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 flex h-full w-12 items-center justify-end bg-gradient-to-l from-white via-white to-transparent px-1"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>
      )}
    </div>
  );
};