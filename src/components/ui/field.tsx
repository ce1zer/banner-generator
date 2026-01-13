import { cn } from "./cn";

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn("text-sm font-medium text-zinc-900", props.className)}
    />
  );
}

export function HelpText(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("text-xs text-zinc-600", props.className)} />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200",
        props.className,
      )}
    />
  );
}

export function Field(props: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-2", props.className)}>
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

