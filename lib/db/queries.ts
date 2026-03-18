import { getDb } from './index';
import type { MatchedMarket, ArbEpisode } from '@/lib/types';

// ============================================================
// Matched Markets
// ============================================================

export function upsertMatchedMarket(market: Omit<MatchedMarket, 'id' | 'matchedAt'>): MatchedMarket {
  return upsertMatchedMarketSafe(market);
}

function toMatchedMarket(row: MatchedMarketRow): MatchedMarket {
  return {
    id: row.id,
    predictMarketId: row.predict_market_id,
    predictTitle: row.predict_title,
    polyConditionId: row.poly_condition_id,
    polySlug: row.poly_slug ?? '',
    polyQuestion: row.poly_question ?? '',
    category: row.category ?? '',
    predictFeeBps: row.predict_fee_bps,
    matchedAt: row.matched_at,
  };
}

interface MatchedMarketRow {
  id: number;
  predict_market_id: number;
  predict_title: string;
  poly_condition_id: string;
  poly_slug: string | null;
  poly_question: string | null;
  category: string | null;
  predict_fee_bps: number;
  matched_at: string;
}

export function upsertMatchedMarketSafe(market: Omit<MatchedMarket, 'id' | 'matchedAt'>): MatchedMarket {
  const db = getDb();
  db.prepare(`
    INSERT INTO matched_markets (predict_market_id, predict_title, poly_condition_id, poly_slug, poly_question, category, predict_fee_bps)
    VALUES (@predictMarketId, @predictTitle, @polyConditionId, @polySlug, @polyQuestion, @category, @predictFeeBps)
    ON CONFLICT(predict_market_id) DO UPDATE SET
      predict_title = excluded.predict_title,
      poly_slug = excluded.poly_slug,
      poly_question = excluded.poly_question,
      category = excluded.category,
      predict_fee_bps = excluded.predict_fee_bps
  `).run(market);

  const row = db.prepare(`SELECT * FROM matched_markets WHERE predict_market_id = ?`).get(market.predictMarketId) as MatchedMarketRow;
  return toMatchedMarket(row);
}

export function getAllMatchedMarkets(): MatchedMarket[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM matched_markets ORDER BY id').all() as MatchedMarketRow[];
  return rows.map(toMatchedMarket);
}

// ============================================================
// Arb Episodes
// ============================================================

interface EpisodeRow {
  id: number;
  matched_market_id: number;
  title: string;
  strategy: 'A' | 'B';
  threshold_pct: number;
  started_at: string;
  peak_arb_pct: number;
  peak_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  status: 'OPEN' | 'CLOSED';
}

function toEpisode(row: EpisodeRow): ArbEpisode {
  return {
    id: row.id,
    matchedMarketId: row.matched_market_id,
    title: row.title,
    strategy: row.strategy,
    thresholdPct: row.threshold_pct,
    startedAt: row.started_at,
    peakArbPct: row.peak_arb_pct,
    peakAt: row.peak_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    status: row.status,
  };
}

export function openEpisode(data: {
  matchedMarketId: number;
  title: string;
  strategy: 'A' | 'B';
  thresholdPct: number;
  arbPct: number;
}): ArbEpisode {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO arb_episodes (matched_market_id, title, strategy, threshold_pct, started_at, peak_arb_pct, peak_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
  `).run(data.matchedMarketId, data.title, data.strategy, data.thresholdPct, now, data.arbPct, now);

  return toEpisode(
    db.prepare('SELECT * FROM arb_episodes WHERE id = ?').get(result.lastInsertRowid) as EpisodeRow
  );
}

export function updateEpisodePeak(episodeId: number, arbPct: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE arb_episodes SET peak_arb_pct = ?, peak_at = ? WHERE id = ? AND peak_arb_pct < ?
  `).run(arbPct, now, episodeId, arbPct);
}

export function closeEpisode(episodeId: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE arb_episodes
    SET status = 'CLOSED', ended_at = ?,
        duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER)
    WHERE id = ? AND status = 'OPEN'
  `).run(now, now, episodeId);
}

export function getOpenEpisodeForMarket(matchedMarketId: number): ArbEpisode | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT * FROM arb_episodes WHERE matched_market_id = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1`
  ).get(matchedMarketId) as EpisodeRow | undefined;
  return row ? toEpisode(row) : null;
}

export function getOpenEpisodes(): ArbEpisode[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM arb_episodes WHERE status = 'OPEN' ORDER BY started_at DESC`).all() as EpisodeRow[]).map(toEpisode);
}

export function getRecentEpisodes(limit = 50): ArbEpisode[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM arb_episodes ORDER BY started_at DESC LIMIT ?`).all(limit) as EpisodeRow[]).map(toEpisode);
}

export function getEpisodeStats(): { total: number; open: number; avgDurationMin: number } {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open,
      AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds / 60.0 ELSE NULL END) as avg_dur
    FROM arb_episodes
  `).get() as { total: number; open: number; avg_dur: number | null };

  return {
    total: stats.total,
    open: stats.open,
    avgDurationMin: stats.avg_dur ?? 0,
  };
}
