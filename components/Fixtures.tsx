import { getTournamentData } from "@/lib/get-tournament-data";
import { draft } from "@/data/tournament";
import FixturesClient from "@/components/FixturesClient";

export default async function Fixtures() {
  const { fixtures } = await getTournamentData();
  return <FixturesClient fixtures={fixtures} draft={draft} />;
}
