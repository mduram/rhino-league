export default function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-4 text-2xl font-black tracking-tight text-white">
      {children}
    </h2>
  );
}