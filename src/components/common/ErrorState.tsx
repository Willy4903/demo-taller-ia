interface ErrorStateProps {
  title: string;
  errors: string[];
}

export function ErrorState({ title, errors }: ErrorStateProps) {
  if (errors.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        {errors.slice(0, 10).map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
      {errors.length > 10 && <p className="mt-2 text-xs">…y {errors.length - 10} más.</p>}
    </div>
  );
}
