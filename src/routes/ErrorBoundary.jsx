import { RotateCcw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";

export default function ErrorBoundary() {
  const error = useRouteError();
  const displayedError = {
    status: error?.status || error?.cause?.status || "Oops...",
    message: error?.message || error?.cause.body?.error || "Algo salió mal.",
  };

  error instanceof Error && console.error(error);

  return (
    <main className="mx-auto flex min-h-screen w-full bg-gray-100 justify-center items-center p-6">
      <div className="max-w-2xl grid grid-cols-2 gap-16 items-center">
        <img src="/favicon.png" alt="Logo de la institución" />
        <div className="">
          <h1 className="text-7xl leading-snug font-semibold">
            {displayedError?.status}
          </h1>
          <p className="text-xl">
            {displayedError?.message}{" "}
            <Link
              className="text-emerald-700 inline-flex gap-2 underline decoration-wavy"
              reloadDocument
            >
              Volver a intentar <RotateCcw className="w-5" />
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
