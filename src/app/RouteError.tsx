import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong while loading this page.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">A-Level Chemistry</p>
        <h1 className="text-3xl font-semibold">Page unavailable</h1>
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex gap-3 pt-2">
          <Link className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950" to="/student">
            Go to Student
          </Link>
          <Link className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100" to="/teacher">
            Go to Teacher
          </Link>
        </div>
      </main>
    </div>
  );
}
