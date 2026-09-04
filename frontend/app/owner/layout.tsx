import OwnerProvider from "@/components/owner/OwnerProvider";
import OwnerShell from "@/components/owner/OwnerShell";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OwnerProvider>
      <OwnerShell>{children}</OwnerShell>
    </OwnerProvider>
  );
}
