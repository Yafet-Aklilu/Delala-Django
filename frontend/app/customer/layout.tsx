import CustomerProvider from "@/components/customer/CustomerProvider";
import CustomerShell from "@/components/customer/CustomerShell";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerProvider>
      <CustomerShell>{children}</CustomerShell>
    </CustomerProvider>
  );
}
