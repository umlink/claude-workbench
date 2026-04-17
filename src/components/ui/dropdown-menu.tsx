import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within a DropdownMenu");
  }
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        // Check if click is inside any dropdown menu content
        const dropdownContent = document.querySelector('[data-dropdown-menu-content]');
        if (dropdownContent && !dropdownContent.contains(e.target as Node)) {
          setIsOpen(false);
        } else if (!dropdownContent) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen, triggerRef } = useDropdownMenuContext();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      ref: triggerRef,
    });
  }

  return (
    <button onClick={handleClick} ref={triggerRef}>
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "right" | "bottom-left";
  className?: string;
  [key: string]: any;
}

export function DropdownMenuContent({ children, align = "end", side = "bottom", className, ...props }: DropdownMenuContentProps) {
  const { isOpen } = useDropdownMenuContext();

  if (!isOpen) return null;

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const positionClasses = {
    bottom: "right-0 top-full mt-0",
    right: "left-full top-0 ml-0",
    "bottom-left": "left-0 top-full mt-0",
  };

  return (
    <div
      data-dropdown-menu-content
      onClick={handleContentClick}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "absolute z-[100] min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
        positionClasses[side as keyof typeof positionClasses],
        align === "start" && side === "bottom" && "left-0 right-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function DropdownMenuItem({ children, onClick, className }: DropdownMenuItemProps) {
  const { setIsOpen } = useDropdownMenuContext();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
    setIsOpen(false);
  };

  return (
    <button
      role="menuitem"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
          setIsOpen(false);
        }
      }}
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
    />
  );
}
