export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="card flex min-h-48 items-center justify-center text-sm text-muted">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-black bg-black p-4 text-sm text-white">
      {message}
    </div>
  );
}
