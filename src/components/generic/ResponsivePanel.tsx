import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface ResponsivePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
  unstyled?: boolean;
}

export function ResponsivePanel({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children, 
  footer,
  className,
  size = 'md',
  unstyled = false
}: ResponsivePanelProps) {
  const isMobile = useIsMobile();

  const sizeClasses = {
    md: "sm:max-w-md",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl"
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("max-h-[90vh]", unstyled ? "p-0" : "", className)}>
          {unstyled ? (
            children
          ) : (
            <>
              <DrawerHeader className="text-left border-b pb-4">
                <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
                {description && <DrawerDescription>{description}</DrawerDescription>}
              </DrawerHeader>
              <div className="px-4 py-6 overflow-y-auto">
                {children}
              </div>
              {footer && (
                <DrawerFooter className="border-t pt-4">
                  {footer}
                </DrawerFooter>
              )}
            </>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("w-full flex flex-col p-0", sizeClasses[size], unstyled && "[&>button]:hidden", className)}>
        {unstyled ? (
          children
        ) : (
          <>
            <SheetHeader className="p-6 border-b">
              <SheetTitle className="font-display text-xl">{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
            {footer && (
              <div className="p-6 border-t mt-auto">
                {footer}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
