import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-grey-200 bg-white/50 p-10 text-center dark:border-grey-700 dark:bg-transparent"
    >
      {icon}
      <p className="text-sm font-medium text-grey-700 dark:text-grey-200">{title}</p>
      {description && <p className="max-w-sm text-xs text-grey-400">{description}</p>}
      {action}
    </div>
  );
}
