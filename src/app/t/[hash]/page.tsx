import TabataTimer from "@/components/TabataTimer";
import {
  decodeTabataConfig,
  getWorkoutTitle,
} from "@/lib/tabata-config-url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type TabataConfigPageProps = {
  params: Promise<{
    hash: string;
  }>;
};

export async function generateMetadata({
  params,
}: TabataConfigPageProps): Promise<Metadata> {
  const { hash } = await params;
  const config = decodeTabataConfig(hash);

  if (!config) {
    return {
      title: "Workout not found",
    };
  }

  return {
    title: getWorkoutTitle(config),
    description: `${config.workSeconds}s work, ${config.restSeconds}s rest, ${config.sets} sets`,
  };
}

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
