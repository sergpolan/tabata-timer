import TabataTimer from "@/components/TabataTimer";
import { decodeTabataConfig } from "@/lib/tabata-config-url";
import { notFound } from "next/navigation";

type TabataConfigPageProps = {
  params: Promise<{
    hash: string;
  }>;
};

export default async function TabataConfigPage({ params }: TabataConfigPageProps) {
  const { hash } = await params;
  const config = decodeTabataConfig(hash);

  if (!config) {
    notFound();
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center">
      <TabataTimer initialConfig={config} />
    </main>
  );
}
