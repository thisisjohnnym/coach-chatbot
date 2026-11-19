import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type AllowedTag =
  | "div"
  | "section"
  | "header"
  | "footer"
  | "main"
  | "nav"
  | "aside"
  | "article"
  | "ul"
  | "li"
  | "span"
  | "button"
  | "form";

export interface PrimitiveProps extends HTMLAttributes<HTMLElement> {
  as?: AllowedTag;
  className?: string;
  children?: ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function Box({
  as: Tag = "div",
  className,
  children,
  ...rest
}: PrimitiveProps) {
  const Component = Tag as "div";
  return (
    <Component className={className} {...(rest as HTMLAttributes<HTMLDivElement>)}>
      {children}
    </Component>
  );
}

export function Stack({ className, ...rest }: PrimitiveProps) {
  return <Box className={clsx("flex flex-col", className)} {...rest} />;
}

export function Cluster({ className, ...rest }: PrimitiveProps) {
  return <Box className={clsx("flex flex-row items-center", className)} {...rest} />;
}

export function LayerGrid({ className, ...rest }: PrimitiveProps) {
  return <Box className={clsx("stack-grid", className)} {...rest} />;
}

export function Layer({ className, ...rest }: PrimitiveProps) {
  return <Box className={clsx("stack-cell", className)} {...rest} />;
}
