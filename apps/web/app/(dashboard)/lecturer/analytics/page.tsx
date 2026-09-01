"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Radio, TrendingUp, Video } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";

interface TrendPoint {
  date: string;
  sessions: number;
  checkIns: number;
}

interface UnitStat {
  unitCode: string;
  unitName: string;
  semesterName: string;
  enrolled: number;
  sessions: number;
  checkIns: number;
  averageAttendance: number;
  attendanceRate: number;
  atRiskCount: number;
  status: string;
}

interface MethodStat {
  method: "inPerson" | "online";
  sessions: number;
  checkIns: number;
}

interface LecturerSummary {
  trend: TrendPoint[];
  units: UnitStat[];
  methods: MethodStat[];
  totals: { sessions: number; checkIns: number };
  coverage: { selected: number; used: number };
  insights: { highestUnit: string | null; lowestUnit: string | null };
  overallComplianceRate: number;
  currentTerm: string;
}

const authHeaders = (): Record<string, string> => {
  try {
    const user = JSON.parse(localStorage.getItem("user") ?? "{}") as {
      token?: string;
    };
    return user.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch {
    return {};
  }
};

const trendChartConfig = {
  checkIns: { label: "Check-ins", color: "#059669" },
} satisfies ChartConfig;

const methodChartConfig = {
  inPerson: { label: "In-person", color: "#059669" },
  online: { label: "Online", color: "#0284c7" },
} satisfies ChartConfig;

const unitChartConfig = {
  attendanceRate: { label: "Attendance rate", color: "#059669" },
} satisfies ChartConfig;

/** Status is a state, not a plain magnitude — bars carry it via color so a
 * lecturer can scan for trouble at a glance, same rule the summary badges
 * elsewhere on this page already use. */
const rateColor = (rate: number) =>
  rate >= 75 ? "#059669" : rate >= 60 ? "#d97706" : "#dc2626";

export default function LecturerAnalyticsPage() {
  const [summary, setSummary] = useState<LecturerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/v1/attendance/lecturer/summary", {
          headers: authHeaders(),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as LecturerSummary;
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inPerson = summary?.methods.find((m) => m.method === "inPerson");
  const online = summary?.methods.find((m) => m.method === "online");
  const methodData = [
    { method: "In-person", key: "inPerson", sessions: inPerson?.sessions ?? 0, checkIns: inPerson?.checkIns ?? 0 },
    { method: "Online", key: "online", sessions: online?.sessions ?? 0, checkIns: online?.checkIns ?? 0 },
  ];
  const scoredUnits = summary
    ? [...summary.units]
        .filter((u) => u.sessions > 0)
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
    : [];
  const complianceColor =
    (summary?.overallComplianceRate ?? 0) >= 75
      ? "text-emerald-700"
      : (summary?.overallComplianceRate ?? 0) >= 60
        ? "text-amber-600"
        : "text-red-600";

  return (
    <RoleWorkspaceShell role="lecturer" eyebrow="Lecturer Insights" title="Analytics">
      <main className="p-3 sm:p-4 max-w-[1100px] mx-auto text-[11px] space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10.5px] text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-[10.5px]">
            Loading analytics...
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <Card className="border-slate-200/90 bg-white shadow-2xs p-3">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                  Overall compliance
                </span>
                <p className={`mt-1 text-2xl font-extrabold font-mono ${complianceColor}`}>
                  {summary.overallComplianceRate}%
                </p>
                <p className="text-[9.5px] text-slate-400">{summary.currentTerm}</p>
              </Card>
              <Card className="border-slate-200/90 bg-white shadow-2xs p-3">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                  Sessions (30d)
                </span>
                <p className="mt-1 text-2xl font-extrabold font-mono text-slate-900">
                  {summary.totals.sessions}
                </p>
                <p className="text-[9.5px] text-slate-400">
                  {summary.totals.checkIns} total check-ins
                </p>
              </Card>
              <Card className="border-slate-200/90 bg-white shadow-2xs p-3">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                  Units with sessions
                </span>
                <p className="mt-1 text-2xl font-extrabold font-mono text-slate-900">
                  {summary.coverage.used}
                  <span className="text-slate-400">/{summary.coverage.selected}</span>
                </p>
                <p className="text-[9.5px] text-slate-400">of your teaching units</p>
              </Card>
            </div>

            <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Check-in trend</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {summary.trend.length === 0 ? (
                  <div className="flex h-[180px] items-center justify-center text-[10.5px] text-slate-400">
                    No sessions in the last 30 days yet.
                  </div>
                ) : (
                  <ChartContainer config={trendChartConfig} className="h-[180px] w-full">
                    <AreaChart data={summary.trend} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillCheckIns" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-checkIns)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--color-checkIns)" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value: string) =>
                          new Date(value).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} width={28} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            indicator="line"
                            labelFormatter={(value) =>
                              new Date(String(value)).toLocaleDateString(undefined, {
                                month: "long",
                                day: "numeric",
                              })
                            }
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="checkIns"
                        stroke="var(--color-checkIns)"
                        fill="url(#fillCheckIns)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-2.5 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-slate-500" />
                    <span>By method</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    In-person vs. online check-ins
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3">
                  <ChartContainer config={methodChartConfig} className="h-[140px] w-full">
                    <BarChart data={methodData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} width={28} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value, _name, props) => (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{props.payload.method}</span>
                                <span className="font-mono font-medium">
                                  {value} check-ins · {props.payload.sessions} sessions
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="checkIns" radius={[4, 4, 0, 0]} barSize={40}>
                        <Cell fill="var(--color-inPerson)" />
                        <Cell fill="var(--color-online)" />
                      </Bar>
                    </BarChart>
                  </ChartContainer>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div className="rounded-md bg-emerald-50 px-2.5 py-2">
                      <div className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-700">
                        <ArrowUp className="h-3 w-3" />
                        <span>Highest unit</span>
                      </div>
                      {summary.insights.highestUnit ? (
                        <Badge variant="outline" className="mt-1 font-mono text-[9px]">
                          {summary.insights.highestUnit}
                        </Badge>
                      ) : (
                        <span className="text-[9.5px] text-slate-400">No data</span>
                      )}
                    </div>
                    <div className="rounded-md bg-amber-50 px-2.5 py-2">
                      <div className="flex items-center gap-1 text-[9.5px] font-bold text-amber-700">
                        <ArrowDown className="h-3 w-3" />
                        <span>Lowest unit</span>
                      </div>
                      {summary.insights.lowestUnit ? (
                        <Badge variant="outline" className="mt-1 font-mono text-[9px]">
                          {summary.insights.lowestUnit}
                        </Badge>
                      ) : (
                        <span className="text-[9.5px] text-slate-400">No data</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-slate-500" />
                    <span>Unit performance</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Attendance rate by unit
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3">
                  {scoredUnits.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-[10.5px] text-slate-400">
                      No scored units yet.
                    </div>
                  ) : (
                    <ChartContainer
                      config={unitChartConfig}
                      className="w-full"
                      style={{ height: Math.max(140, Math.min(scoredUnits.length * 30, 260)) }}
                    >
                      <BarChart
                        data={scoredUnits}
                        layout="vertical"
                        margin={{ left: 0, right: 24, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} allowDecimals={false} hide />
                        <YAxis
                          dataKey="unitCode"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          width={60}
                          tick={{ fontSize: 10 }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, _name, props) => (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{props.payload.unitCode}</span>
                                  <span className="font-mono font-medium">{value}% attendance</span>
                                  {props.payload.atRiskCount > 0 && (
                                    <span className="text-amber-600">
                                      · {props.payload.atRiskCount} at-risk
                                    </span>
                                  )}
                                </div>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="attendanceRate" radius={[0, 4, 4, 0]} barSize={16}>
                          {scoredUnits.map((unit) => (
                            <Cell key={unit.unitCode} fill={rateColor(unit.attendanceRate)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </main>
    </RoleWorkspaceShell>
  );
}
