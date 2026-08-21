'use client';

import { Activity, BarChart3, TrendingUp } from 'lucide-react';

import type {
  PriorityPoint,
  TimelinePoint,
  WorkStatusPoint,
} from '@/types/dashboard';
import type { WorkLane, WorkPriority } from '@/types/work';

export function DashboardCharts({
  status,
  priority,
  timeline,
  showNotes,
  showWorkBreakdowns,
  onStatus,
  onPriority,
}: {
  status: WorkStatusPoint[];
  priority: PriorityPoint[];
  timeline: TimelinePoint[];
  showNotes: boolean;
  showWorkBreakdowns: boolean;
  onStatus: (lane: WorkLane) => void;
  onPriority: (priority: WorkPriority) => void;
}) {
  return (
    <section aria-label="Gráficos operacionais" className="space-y-4">
      {showWorkBreakdowns && (
        <div className="grid gap-4 xl:grid-cols-2">
          <BarPanel
            title="Trabalho por status"
            description="Distribuição canônica de Tasks e chamados"
            icon={Activity}
            rows={status.map((item) => ({
              id: item.lane,
              label: item.label,
              first: item.tasks,
              second: item.tickets,
              total: item.total,
            }))}
            firstLabel="Tasks"
            secondLabel="Chamados"
            onClick={(id) => onStatus(id as WorkLane)}
          />
          <BarPanel
            title="Trabalho por prioridade"
            description="Valores e tipos permanecem distinguíveis sem depender de cor"
            icon={BarChart3}
            rows={priority.map((item) => ({
              id: item.priority,
              label: item.label,
              first: item.tasks,
              second: item.tickets,
              total: item.total,
            }))}
            firstLabel="Tasks"
            secondLabel="Chamados"
            onClick={(id) => onPriority(id as WorkPriority)}
          />
        </div>
      )}

      <TimelineChart timeline={timeline} showNotes={showNotes} />
    </section>
  );
}

function BarPanel({
  title,
  description,
  icon: Icon,
  rows,
  firstLabel,
  secondLabel,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof Activity;
  rows: Array<{
    id: string;
    label: string;
    first: number;
    second: number;
    total: number;
  }>;
  firstLabel: string;
  secondLabel: string;
  onClick: (id: string) => void;
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.total));
  const hasData = rows.some((row) => row.total > 0);

  return (
    <article className="rounded-2xl border border-[#303036] bg-[#19191d] p-4 sm:p-5">
      <header className="mb-5 flex items-start gap-3">
        <span className="rounded-lg bg-[#6f55d9]/10 p-2 text-[#9a8cff]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-xs text-[#777780]">{description}</p>
        </div>
      </header>

      {hasData ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onClick(row.id)}
              className="group block w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
              aria-label={`${row.label}: ${row.total}; ${row.first} ${firstLabel}; ${row.second} ${secondLabel}`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-[#c7c7cf] group-hover:text-white">
                  {row.label}
                </span>
                <span className="text-[#9b9ba3] tabular-nums">
                  {row.total} <span className="text-[#666670]">total</span>
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-[#111114]">
                {row.first > 0 && (
                  <span
                    className="h-full bg-[#7c66df]"
                    style={{ width: `${(row.first / maximum) * 100}%` }}
                  />
                )}
                {row.second > 0 && (
                  <span
                    className="h-full bg-sky-500"
                    style={{ width: `${(row.second / maximum) * 100}%` }}
                  />
                )}
              </div>
              <div className="mt-1.5 flex gap-4 text-[10px] text-[#777780]">
                <span>
                  {firstLabel}: {row.first}
                </span>
                <span>
                  {secondLabel}: {row.second}
                </span>
              </div>
            </button>
          ))}
          <div className="flex flex-wrap gap-4 border-t border-[#2a2a30] pt-3 text-[11px] text-[#9b9ba3]">
            <Legend color="bg-[#7c66df]" label={firstLabel} />
            <Legend color="bg-sky-500" label={secondLabel} />
          </div>
        </div>
      ) : (
        <EmptyChart />
      )}
    </article>
  );
}

function TimelineChart({
  timeline,
  showNotes,
}: {
  timeline: TimelinePoint[];
  showNotes: boolean;
}) {
  const width = 720;
  const height = 230;
  const insetX = 38;
  const insetTop = 20;
  const insetBottom = 38;
  const plotHeight = height - insetTop - insetBottom;
  const maximum = Math.max(
    1,
    ...timeline.flatMap((point) => [
      point.created,
      point.completed,
      ...(showNotes ? [point.notes] : []),
    ])
  );
  const x = (index: number) =>
    insetX + (index * (width - insetX * 2)) / Math.max(1, timeline.length - 1);
  const y = (value: number) =>
    insetTop + plotHeight - (value / maximum) * plotHeight;
  const points = (field: 'created' | 'completed' | 'notes') =>
    timeline.map((point, index) => `${x(index)},${y(point[field])}`).join(' ');
  const hasData = timeline.some(
    (point) => point.created || point.completed || (showNotes && point.notes)
  );

  return (
    <article className="rounded-2xl border border-[#303036] bg-[#19191d] p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-[#6f55d9]/10 p-2 text-[#9a8cff]">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Evolução no tempo</h2>
            <p className="text-xs text-[#777780]">
              Trabalho criado versus finalizado no período
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-[#9b9ba3]">
          <Legend color="bg-[#9a8cff]" label="Criados" />
          <Legend color="bg-emerald-400" label="Finalizados" />
          {showNotes && <Legend color="bg-amber-400" label="Notas criadas" />}
        </div>
      </header>

      {hasData ? (
        <div className="mt-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full min-w-0"
            role="img"
            aria-labelledby="dashboard-timeline-title dashboard-timeline-desc"
          >
            <title id="dashboard-timeline-title">Evolução do trabalho</title>
            <desc id="dashboard-timeline-desc">
              Séries de trabalho criado, finalizado e notas criadas por faixa de
              data.
            </desc>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const lineY = insetTop + plotHeight * ratio;
              const value = Math.round(maximum * (1 - ratio));
              return (
                <g key={ratio}>
                  <line
                    x1={insetX}
                    x2={width - insetX}
                    y1={lineY}
                    y2={lineY}
                    stroke="#303036"
                    strokeWidth="1"
                  />
                  <text
                    x={insetX - 8}
                    y={lineY + 4}
                    fill="#777780"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
            <polyline
              points={points('created')}
              fill="none"
              stroke="#9a8cff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={points('completed')}
              fill="none"
              stroke="#34d399"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {showNotes && (
              <polyline
                points={points('notes')}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {timeline.map((point, index) => (
              <g key={point.key}>
                <circle
                  cx={x(index)}
                  cy={y(point.created)}
                  r="3"
                  fill="#9a8cff"
                >
                  <title>{`${point.label}: ${point.created} criados`}</title>
                </circle>
                <circle
                  cx={x(index)}
                  cy={y(point.completed)}
                  r="3"
                  fill="#34d399"
                >
                  <title>{`${point.label}: ${point.completed} finalizados`}</title>
                </circle>
                <text
                  x={x(index)}
                  y={height - 12}
                  fill="#777780"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
          <ul className="sr-only">
            {timeline.map((point) => (
              <li key={point.key}>
                {point.label}: {point.created} criados, {point.completed}{' '}
                finalizados{showNotes ? `, ${point.notes} notas` : ''}.
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyChart />
      )}
    </article>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function EmptyChart() {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[#303036] text-center text-sm text-[#777780]">
      Nenhum dado corresponde aos filtros atuais.
    </div>
  );
}
