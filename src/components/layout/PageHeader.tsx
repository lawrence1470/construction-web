interface PageHeaderProps {
  title: string;
  description?: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-[var(--text-primary)] mb-2 transition-colors">
        {title}
      </h1>
      {description && (
        <p className="text-gray-600 dark:text-[var(--text-secondary)] transition-colors">
          {description}
        </p>
      )}
    </div>
  );
}
