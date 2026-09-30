export default function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand sm:flex">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-fg-muted sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
