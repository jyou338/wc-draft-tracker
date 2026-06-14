import Scoreboard from "@/components/Scoreboard";
import MatchLog from "@/components/MatchLog";
import Fixtures from "@/components/Fixtures";
import PointsChart from "@/components/PointsChart";
import NextUpdate from "@/components/NextUpdate";
import DevRefreshButton from "@/components/DevRefreshButton";
import {
  draft,
  results,
  fixtures,
  lastUpdated,
} from "@/data/tournament";
import { SCORING, SCORING_LABELS, ASSUMED } from "@/lib/scoring";

function latestResult() {
  if (results.length === 0) return null;
  return [...results].sort((a, b) => b.matchday - a.matchday)[0];
}

export default function Page() {
  const latest = latestResult();
  const flagOf = (team: string) =>
    draft.find((d) => d.team === team)?.flag ?? "";

  return (
    <main className="wrap">
      {process.env.NODE_ENV === "development" && <DevRefreshButton />}
      <header className="masthead">
        <div>
          <p className="eyebrow">Fantasy Draft · {draft.length} Managers</p>
          <h1 className="title">
            World Cup
            <br />
            Draft Table
          </h1>
          <p className="subtitle">
            Points scored by each manager&rsquo;s drafted nation, live through
            the tournament.
          </p>
        </div>

        {latest && (
          <div className="bug">
            <div>
              <div className="bug-label">Latest result</div>
              <div className="bug-teams">
                <span className="flag" aria-hidden>
                  {flagOf(latest.team)}
                </span>
                {latest.team}
                <span className="bug-score">
                  {latest.scoreFor}–{latest.scoreAgainst}
                </span>
                {latest.opponent}
              </div>
            </div>
          </div>
        )}
      </header>

      <section className="section">
        <div className="section-head">
          <h2>Standings</h2>
          <span className="count">Matchday {Math.max(...results.map((r) => r.matchday), 1)}</span>
        </div>
        <Scoreboard />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Points Race</h2>
          <span className="count">Cumulative points per manager</span>
        </div>
        <PointsChart />
      </section>

      <div className="grid2">
        <section>
          <div className="section-head">
            <h2>Results</h2>
            <span className="count">{results.length} logged</span>
          </div>
          <MatchLog />
        </section>

        <section>
          <div className="section-head">
            <h2>Up Next</h2>
            <span className="count">{fixtures.length} fixtures</span>
          </div>
          <Fixtures />
        </section>
      </div>

      <footer className="footer">
        <div className="keys">
          {(Object.keys(SCORING) as (keyof typeof SCORING)[]).map((k) => (
            <span className="key" key={k}>
              {SCORING_LABELS[k]}{" "}
              <b>
                {SCORING[k] > 0 ? "+" : ""}
                {SCORING[k]}
              </b>
              {ASSUMED.includes(k) && <span className="star"> *</span>}
            </span>
          ))}
        </div>
        <p className="foot-note">
          <span className="star">*</span> Assumed value &mdash; only goals (+5)
          and assists (+2) were confirmed by the organiser. Adjust these in{" "}
          <code>lib/scoring.ts</code> once your league confirms them and every
          total recalculates. &nbsp;<span className="stamp">{lastUpdated}</span>
          &nbsp;·&nbsp;<NextUpdate />
        </p>
      </footer>
    </main>
  );
}
