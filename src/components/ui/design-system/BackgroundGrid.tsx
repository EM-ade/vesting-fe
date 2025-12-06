import { cn } from "@/lib/utils";

export function BackgroundGrid({
  className,
  containerClassName,
}: {
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full bg-slate-950 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]",
        containerClassName
      )}
    >
      <div className="absolute inset-0 bg-slate-950 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className={cn("absolute inset-0", className)} />
    </div>
  );
}
