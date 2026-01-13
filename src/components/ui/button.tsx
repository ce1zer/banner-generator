import { cn } from "./cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none";
  const variants: Record<NonNullable<Props["variant"]>, string> = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  };
  const sizes: Record<NonNullable<Props["size"]>, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
  };

  return (
    <button
      {...props}
      className={cn(base, variants[variant], sizes[size], className)}
    />
  );
}

