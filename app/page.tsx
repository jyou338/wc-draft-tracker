import Scoreboard from "@/components/Scoreboard";
import MatchLog from "@/components/MatchLog";
import Fixtures from "@/components/Fixtures";
import PointsChart from "@/components/PointsChart";
import DevRefreshButton from "@/components/DevRefreshButton";
import HeaderMatchCard from "@/components/HeaderMatchCard";
import LiveProvider from "@/components/LiveProvider";
import { draft, results, fixtures, lastUpdated, liveMatches } from "@/data/tournament";
import { SCORING, SCORING_LABELS, ASSUMED } from "@/lib/scoring";

export default function Page() {
  return (
    <LiveProvider initialLiveMatches={liveMatches}>
    <main className="wrap">
      {process.env.NODE_ENV === "development" && <DevRefreshButton />}
      <header className="masthead">
        <div className="masthead-title">
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
        <HeaderMatchCard />
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
          total recalculates. &nbsp;<span className="stamp">Updated {lastUpdated}</span>
        </p>
      </footer>
    </main>
    </LiveProvider>
  );
}
