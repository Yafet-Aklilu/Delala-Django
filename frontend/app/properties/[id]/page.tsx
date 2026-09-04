import PlaceholderPage from "@/components/PlaceholderPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <PlaceholderPage
      title={`Property ${id}`}
      description="Full property detail pages will be rebuilt next, powered by the existing Delala property API."
    />
  );
}
