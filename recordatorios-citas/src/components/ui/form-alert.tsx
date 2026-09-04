export function FormAlert({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        error ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
      }`}
      role="alert"
    >
      {error || success}
    </div>
  );
}
