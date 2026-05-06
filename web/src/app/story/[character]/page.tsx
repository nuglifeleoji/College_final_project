import { notFound } from "next/navigation";
import { getCharacter } from "@/lib/characters";
import StoryView from "./StoryView";

type Props = { params: Promise<{ character: string }> };

export async function generateMetadata({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  return { title: c ? `${c.name} · Story · Three-Body` : "Story" };
}

export default async function StoryPage({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  if (!c) notFound();
  return <StoryView character={c} />;
}
