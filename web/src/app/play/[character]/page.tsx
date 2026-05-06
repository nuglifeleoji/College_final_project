import { notFound } from "next/navigation";
import { getCharacter } from "@/lib/characters";
import PlaySurface from "./PlaySurface";

type Props = {
  params: Promise<{ character: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  return { title: c ? `${c.name} · Three-Body` : "Three-Body" };
}

export default async function PlayPage({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  if (!c) notFound();
  return <PlaySurface character={c} />;
}
