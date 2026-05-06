import { notFound } from "next/navigation";
import { getCharacter } from "@/lib/characters";
import { AXES, type Axis } from "@/lib/factions";
import EndingView from "./EndingView";

type Props = {
  params: Promise<{ character: string }>;
  searchParams: Promise<{ axis?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { character } = await params;
  const c = getCharacter(character);
  return { title: c ? `${c.name} · Ending · Three-Body` : "Ending" };
}

export default async function EndingPage({ params, searchParams }: Props) {
  const { character } = await params;
  const { axis: axisParam } = await searchParams;
  const c = getCharacter(character);
  if (!c) notFound();
  const axis: Axis = (AXES as string[]).includes(axisParam ?? "")
    ? (axisParam as Axis)
    : "frontier";
  return <EndingView character={c} axis={axis} />;
}
