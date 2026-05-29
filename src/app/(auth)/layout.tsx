export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-gradient-to-b from-brand-50 to-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Printly</h1>
          <p className="mt-1 text-sm text-neutral-500">Campus print &amp; stationery</p>
        </div>
        {children}
      </div>
    </div>
  );
}
