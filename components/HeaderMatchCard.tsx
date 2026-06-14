import { draft, fixtures } from "@/data/tournament";
import HeaderMatchCardClient from "@/components/HeaderMatchCardClient";

const flagOf = (team: string) => draft.find((d) => d.team === team)?.flag ?? "";

export default function HeaderMatchCard() {
  const next = [...fixtures]
    .filter((f) => f.kickoffISO)
    .sort(
      (a, b) =>
        new Date(a.kickoffISO!).getTime() - new Date(b.kickoffISO!).getTime(),
    )[0];

  const nextFixture = next
    ? {
        team: next.team,
        opponent: next.opponent,
        flag: flagOf(next.team),
        kickoffISO: next.kickoffISO!,
        kickoff: next.kickoff,
      }
    : null;

  return <HeaderMatchCardClient nextFixture={nextFixture} />;
}
