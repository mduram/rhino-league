export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 text-white shadow-2xl shadow-black/30 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}