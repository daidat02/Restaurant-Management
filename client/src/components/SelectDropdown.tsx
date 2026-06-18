import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SelectDropdownProps = {
  // Bạn có thể thêm các props tùy chỉnh ở đây nếu cần
  children: React.ReactNode;
  size?:number
  groupLabel: {
    label?: string;
    items?: { label: string; 
        shortcut?: string; 
        disabled?: boolean, 
        dropdownMenuSub?: boolean,
        subItems?: { label: string; shortcut?: string; disabled?: boolean }[],
        action?: () => void;
        path?: string;
        hidden?:boolean;
    }[]; // Mảng item cho dropdo
    }[];
}

export function SelectDropdown({ children, groupLabel, size }: SelectDropdownProps) {
    
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={`w-${size || 55}`} align="start">

        {groupLabel?.map((group, index)=>{
            return (
                <DropdownMenuGroup>
                    {group?.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
                    {group?.items?.map((item, index)=>{
                        return (
                           (item.dropdownMenuSub !== true) ? (
                            <DropdownMenuItem className={item?.hidden ? "hidden" : ""} disabled={item.disabled} onClick={item.action}>
                                {item.label}
                                {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
                            </DropdownMenuItem>
                           ):(
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className={item?.hidden ? "hidden" : ""} disabled={item.disabled}>
                                    {item.label}
                                    {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="w-40">
                                        {item.subItems?.map((subItem, index) => (
                                            <DropdownMenuItem key={index} disabled={subItem.disabled} onClick={item.action}>
                                                {subItem.label}
                                                {subItem.shortcut && <DropdownMenuShortcut>{subItem.shortcut}</DropdownMenuShortcut>}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                           )
                        )
                    })}
                    {index !== groupLabel.length - 1 && <DropdownMenuSeparator />}
                </DropdownMenuGroup>
            )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
