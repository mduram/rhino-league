export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
            Harvard Rhino League
          </p>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-3 max-w-2xl text-red-100/70">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </div>
    </main>
  );
}