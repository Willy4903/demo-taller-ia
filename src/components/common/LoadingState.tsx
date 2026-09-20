interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Cargando…' }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 p-10">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy/20 border-t-navy dark:border-white/20 dark:border-t-white" />
      <span className="text-sm text-grey-700 dark:text-grey-200">{label}</span>
    </div>
  );
}
