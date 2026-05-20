import { isRouteErrorResponse, useRouteError } from "react-router";

export default function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start justify-center gap-3 p-6">
        <h1 className="text-2xl font-semibold">Error {error.status}</h1>
        <p className="text-lg">{error.statusText || "Something went wrong."}</p>
        {error.data ? <pre className="w-full overflow-auto rounded bg-slate-100 p-3 text-sm">{String(error.data)}</pre> : null}
      </main>
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected application error.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Unexpected Error</h1>
      <p className="text-lg">{message}</p>
    </main>
  );
}
