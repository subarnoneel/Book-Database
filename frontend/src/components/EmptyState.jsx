function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
        <Icon className="h-7 w-7 text-brand-600" aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
