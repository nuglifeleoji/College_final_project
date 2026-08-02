import { notFound } from "next/navigation";
import { CHARACTERS, getCharacter } from "@/lib/characters";
import EndingView from "./EndingView";

type Props = {
  params: Promise<{ character: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return CHARACTERS.map((character) => ({ character: character.id }));
}

export async function generateMetadata({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  return { title: c ? `${c.name} · Ending · Three-Body` : "Ending" };
}

export default async function EndingPage({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  if (!c) notFound();
  return <EndingView character={c} />;
}
