import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <>{children}</>;
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, onClick, asChild }: DropdownMenuTriggerProps) {
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, { onClick });
  }
  return <button onClick={onClick}>{children}</button>;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "right" | "bottom-left";
  className?: string;
  [key: string]: any;
}

export function DropdownMenuContent({ children, align = "end", side = "bottom", className, ...props }: DropdownMenuContentProps) {
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const positionClasses = {
    bottom: "right-0 top-full mt-0",
    right: "left-full top-0 ml-1",
    "bottom-left": "left-0 top-full mt-0",
  };

  return (
    <div
      onClick={handleContentClick}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "absolute z-[100] min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200",
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

export function DropdownMenuItem({ children, onClick, className, icon }: DropdownMenuItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
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
        }
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        className
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
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
