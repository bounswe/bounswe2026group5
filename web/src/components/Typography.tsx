// components/ui/typography.tsx
import { cn } from "@/lib/utils";
import { type ElementType, type ComponentPropsWithoutRef } from "react";

type TypographyProps<T extends ElementType> = {
    as?: T;
    className?: string;
    children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

// --- Variants ---

export function Display<T extends ElementType = "h1">({
                                                          as, className, children, ...props
                                                      }: TypographyProps<T>) {
    const Tag = as ?? "h1";
    return (
        <Tag className={cn("text-4xl font-bold tracking-tight lg:text-5xl font-display", className)} {...props}>
            {children}
        </Tag>
    );
}

export function Heading<T extends ElementType = "h2">({
                                                          as, className, children, ...props
                                                      }: TypographyProps<T>) {
    const Tag = as ?? "h2";
    return (
        <Tag className={cn("text-2xl font-semibold tracking-tight", className)} {...props}>
            {children}
        </Tag>
    );
}

export function Subheading<T extends ElementType = "h3">({
                                                             as, className, children, ...props
                                                         }: TypographyProps<T>) {
    const Tag = as ?? "h3";
    return (
        <Tag className={cn("text-lg font-medium text-muted-foreground", className)} {...props}>
            {children}
        </Tag>
    );
}

export function Body<T extends ElementType = "p">({
                                                      as, className, children, ...props
                                                  }: TypographyProps<T>) {
    const Tag = as ?? "p";
    return (
        <Tag className={cn("text-base leading-relaxed", className)} {...props}>
            {children}
        </Tag>
    );
}

export function Muted<T extends ElementType = "p">({
                                                       as, className, children, ...props
                                                   }: TypographyProps<T>) {
    const Tag = as ?? "p";
    return (
        <Tag className={cn("text-sm text-muted-foreground", className)} {...props}>
            {children}
        </Tag>
    );
}