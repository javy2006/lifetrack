/**
 * Small, accessible charts for the month recap and the results. Every value comes from the
 * engine's month records (cashAtEnd / savingsAtEnd). Series colours are a validated categorical
 * palette (fixed order, CVD-safe); identity never relies on colour alone: there is a legend,
 * direct labels, a hover tooltip per mark (SVG <title>) and a table view.
 */
import type { CharacterId, GameState, PlayerState } from '../game/types.ts';
import { formatRM } from '../game/format.ts';
import { getCharacter } from '../game/characters.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { LearnMore } from './ui.tsx';

/** Validated categorical slots (validate_palette.js: all checks pass on the light card surface). */
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'] as const;
const PLAYER_ORDER: CharacterId[] = ['alex', 'meiling', 'daniel', 'aisyah'];

function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

/** Cash and savings at the end of each closed month for one player: stacked columns. */
export function RecapChart({ player }: { player: PlayerState }) {
  const { t } = useI18n();
  const rows = player.history.filter((r) => r.cashAtEnd !== null && r.savingsAtEnd !== null);
  if (rows.length === 0) return null;
  const W = 320, H = 150, pad = { l: 44, r: 8, t: 10, b: 22 };
  const max = niceMax(Math.max(...rows.map((r) => Math.max(0, r.cashAtEnd!) + Math.max(0, r.savingsAtEnd!))));
  const slot = (W - pad.l - pad.r) / 6, bw = Math.min(26, slot * 0.55);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const month = (r: number) => t(`monthsShort.${r - 1}`);
  return <figure className="chart">
    <figcaption className="chart-title">{t('summary.chartTitle')}</figcaption>
    <div className="chart-legend" aria-hidden="true"><span><i style={{ background: SERIES[0] }}/>{t('common.cash')}</span><span><i style={{ background: SERIES[1] }}/>{t('common.savings')}</span></div>
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={t('summary.chartAria')}>
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="chart-grid"/><text x={pad.l - 6} y={y(max * f) + 3} className="chart-axis" textAnchor="end">{formatRM(max * f)}</text></g>)}
      {rows.map((r, i) => {
        const cash = Math.max(0, r.cashAtEnd!), sav = Math.max(0, r.savingsAtEnd!), x = pad.l + slot * i + (slot - bw) / 2;
        const cashTop = y(cash), savTop = y(cash + sav);
        return <g key={r.round}>
          <title>{`${month(r.round)}: ${t('common.cash')} ${formatRM(r.cashAtEnd!)} · ${t('common.savings')} ${formatRM(r.savingsAtEnd!)}`}</title>
          {cash > 0 && <rect x={x} y={cashTop} width={bw} height={y(0) - cashTop} rx={sav > 0 ? 0 : 4} fill={SERIES[0]}/>}
          {sav > 0 && <rect x={x} y={savTop} width={bw} height={Math.max(0, cashTop - savTop - 2)} rx={4} fill={SERIES[1]}/>}
          <text x={x + bw / 2} y={H - 6} className="chart-axis" textAnchor="middle">{month(r.round)}</text>
        </g>;
      })}
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="chart-baseline"/>
    </svg>
    <LearnMore label={t('common.learnMore')}><table className="chart-table"><thead><tr><th/><th>{t('common.cash')}</th><th>{t('common.savings')}</th></tr></thead><tbody>{rows.map((r) => <tr key={r.round}><th>{t(`months.${r.round - 1}`)}</th><td>{formatRM(r.cashAtEnd!)}</td><td>{formatRM(r.savingsAtEnd!)}</td></tr>)}</tbody></table></LearnMore>
  </figure>;
}

/** Net worth (cash + savings) of every player at the end of each month: one line per player. */
export function NetWorthChart({ state }: { state: GameState }) {
  const { t } = useI18n();
  const players = PLAYER_ORDER.map((id) => state.players.find((p) => p.id === id)).filter((p): p is PlayerState => Boolean(p));
  const series = players.map((p, i) => ({ id: p.id, name: getCharacter(p.id).name, color: SERIES[i]!, points: p.history.filter((r) => r.cashAtEnd !== null).map((r) => ({ round: r.round, v: r.cashAtEnd! + r.savingsAtEnd! })) }));
  const all = series.flatMap((s) => s.points.map((p) => p.v));
  if (all.length === 0) return null;
  const W = 520, H = 200, pad = { l: 52, r: 70, t: 12, b: 24 };
  const max = niceMax(Math.max(...all)), min = Math.min(0, ...all);
  const x = (round: number) => pad.l + ((W - pad.l - pad.r) * (round - 1)) / 5;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
  // Direct labels at the line ends, nudged apart so names never collide.
  const ends = series.map((s) => ({ s, y: y(s.points[s.points.length - 1]?.v ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i]!.y - ends[i - 1]!.y < 13) ends[i]!.y = ends[i - 1]!.y + 13;
  return <figure className="chart chart-wide">
    <figcaption className="chart-title">{t('results.chartTitle')}</figcaption>
    <div className="chart-legend" aria-hidden="true">{series.map((s) => <span key={s.id}><i style={{ background: s.color }}/>{s.name}{s.id === state.humanId ? ` (${t('common.you')})` : ''}</span>)}</div>
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={t('results.chartAria')}>
      {[0, 0.5, 1].map((f) => { const v = min + (max - min) * f; return <g key={f}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="chart-grid"/><text x={pad.l - 6} y={y(v) + 3} className="chart-axis" textAnchor="end">{formatRM(v)}</text></g>; })}
      {[1, 2, 3, 4, 5, 6].map((r) => <text key={r} x={x(r)} y={H - 6} className="chart-axis" textAnchor="middle">{t(`monthsShort.${r - 1}`)}</text>)}
      {series.map((s) => <g key={s.id}>
        <polyline fill="none" stroke={s.color} strokeWidth={s.id === state.humanId ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" points={s.points.map((p) => `${x(p.round)},${y(p.v)}`).join(' ')}/>
        {s.points.map((p) => <circle key={p.round} cx={x(p.round)} cy={y(p.v)} r={4} fill={s.color} stroke="#fffdf8" strokeWidth={2}><title>{`${s.name} · ${t(`months.${p.round - 1}`)}: ${formatRM(p.v)}`}</title></circle>)}
      </g>)}
      {ends.map(({ s, y: ly }) => <text key={s.id} x={W - pad.r + 8} y={ly + 4} className="chart-label">{s.name}</text>)}
    </svg>
    <LearnMore label={t('common.learnMore')}><table className="chart-table"><thead><tr><th/>{series.map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead><tbody>{[1, 2, 3, 4, 5, 6].map((r) => <tr key={r}><th>{t(`months.${r - 1}`)}</th>{series.map((s) => <td key={s.id}>{formatRM(s.points.find((p) => p.round === r)?.v ?? 0)}</td>)}</tr>)}</tbody></table></LearnMore>
  </figure>;
}
