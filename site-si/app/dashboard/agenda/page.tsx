"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, RotateCcw, Power } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AgendaEvent = {
  id: string;
  title: string;
  descricao: string;
  statusAtual: string;
  start: string;
  end: string;
  categoria: string | null;
  entityType: "servico" | "contabilidade";
  href: string;
};

type GoogleStatus = {
  connected: boolean;
  integration?: {
    accountEmail: string | null;
    calendarId: string;
    watchExpiresAt: string | null;
    lastSyncedAt: string | null;
  };
};

type ViewMode = "day" | "week" | "month";

function startOfDay(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

function monthBounds(base: Date) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

function dayBounds(base: Date) {
  const start = startOfDay(base);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

function weekBounds(base: Date) {
  const pivot = startOfDay(base);
  const day = pivot.getDay();
  const start = new Date(pivot);
  start.setDate(pivot.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function dayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isToday(d: Date) {
  return dayKey(d) === dayKey(new Date());
}

function buildMonthGrid(base: Date): Date[] {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const firstWeekday = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - firstWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function AgendaPage() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [google, setGoogle] = useState<GoogleStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const bounds = useMemo(() => {
    if (viewMode === "day") return dayBounds(cursor);
    if (viewMode === "week") return weekBounds(cursor);
    return monthBounds(cursor);
  }, [cursor, viewMode]);
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const weekDays = useMemo(() => {
    const { start } = weekBounds(cursor);
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [cursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const ev of events) {
      const k = dayKey(new Date(ev.start));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      map.set(k, list);
    }
    return map;
  }, [events]);
  const dayEvents = useMemo(() => {
    const k = dayKey(cursor);
    return eventsByDay.get(k) || [];
  }, [eventsByDay, cursor]);

  async function load() {
    setLoading(true);
    setError("");
    const from = bounds.start.toISOString();
    const to = bounds.end.toISOString();
    const [eventsRes, googleRes] = await Promise.all([
      api<AgendaEvent[]>(`/agenda/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      api<GoogleStatus>("/integrations/google-calendar"),
    ]);
    if (eventsRes.status === 401 || googleRes.status === 401) {
      router.push("/login");
      return;
    }
    if (eventsRes.error) setError(eventsRes.error.message);
    setEvents(eventsRes.data || []);
    setGoogle(googleRes.data || { connected: false });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [cursor, viewMode]);

  async function moveEvent(eventId: string, targetDay: Date) {
    const current = events.find((e) => e.id === eventId);
    if (!current) return;
    if (current.entityType !== "servico") return;
    const original = new Date(current.start);
    const moved = new Date(targetDay);
    moved.setHours(original.getHours(), original.getMinutes(), 0, 0);
    const { error: err, status } = await api(`/agenda/events/${eventId}`, {
      method: "PATCH",
      body: { start: moved.toISOString() },
    });
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  async function resyncGoogle(action: "resync" | "restart_watch") {
    const { error: err, status } = await api("/integrations/google-calendar", {
      method: "POST",
      body: { action },
    });
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  async function connectGoogle() {
    const { data, error: err, status } = await api<{ url: string }>("/integrations/google-calendar/connect", {
      method: "POST",
      body: {},
    });
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err || !data?.url) {
      setError(err?.message || "Não foi possível iniciar conexão com Google.");
      return;
    }
    window.location.href = data.url;
  }

  async function disconnectGoogle() {
    const { error: err, status } = await api("/integrations/google-calendar", { method: "DELETE" });
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  const periodLabel = useMemo(() => {
    if (viewMode === "day") {
      return cursor.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString("pt-BR")} - ${end.toLocaleDateString("pt-BR")}`;
    }
    return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [viewMode, cursor, weekDays]);
  const periodKey = `${viewMode}-${bounds.start.toISOString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        description="Visualize por dia, semana ou mês e reagende serviços com facilidade."
        actions={
          <Tabs
            variant="segmented"
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            items={[
              { value: "day", label: "Dia" },
              { value: "week", label: "Semana" },
              { value: "month", label: "Mês" },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Google Agenda</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                {google.connected
                  ? `Conectado (${google.integration?.accountEmail || "conta da empresa"})`
                  : "Não conectado"}
              </p>
              {google.integration?.lastSyncedAt && (
                <p className="mt-0.5 text-xs text-ink-muted">
                  Última sincronização: {new Date(google.integration.lastSyncedAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!google.connected ? (
                <Button type="button" onClick={connectGoogle}>
                  Conectar Google
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => resyncGoogle("resync")}
                    title="Sincronizar agora"
                    aria-label="Sincronizar agora"
                    className="h-10 w-10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => resyncGoogle("restart_watch")}
                    title="Reiniciar webhook"
                    aria-label="Reiniciar webhook"
                    className="h-10 w-10"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={disconnectGoogle}
                    title="Desconectar Google"
                    aria-label="Desconectar Google"
                    className="h-10 w-10"
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="first-letter:uppercase">{periodLabel}</CardTitle>
            {loading && <span className="text-sm text-ink-muted">Carregando…</span>}
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={periodKey}
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-2"
            >
            {viewMode !== "day" && (
              <div className="mb-2 grid grid-cols-7 gap-2 text-xs uppercase text-ink-muted">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
                  <div key={w} className="px-2">{w}</div>
                ))}
              </div>
            )}

            {viewMode === "day" && (
              <div
                className={`min-h-[240px] rounded-control border border-line p-3 ${isToday(cursor) ? "ring-2 ring-inset ring-amber-500" : ""}`}
              >
                <div className="mb-3 text-xs font-medium text-ink-muted">
                  {cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
                <div className="space-y-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-sm text-ink-muted">Nenhum serviço agendado para este dia.</p>
                  ) : (
                    dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-control bg-accent px-3 py-2 text-sm text-accent-fg"
                        title={`${ev.title} (${new Date(ev.start).toLocaleString("pt-BR")})`}
                      >
                        <Link href={ev.href} className="block">
                          <div className="truncate font-medium">{ev.title}</div>
                          <div className="opacity-90">
                            {new Date(ev.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {viewMode === "week" && (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const k = dayKey(day);
                  const weekEvents = eventsByDay.get(k) || [];
                  return (
                    <div
                      key={k}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const eventId = e.dataTransfer.getData("text/event-id");
                        if (!eventId) return;
                        await moveEvent(eventId, day);
                        setDraggingEventId(null);
                      }}
                      className={`min-h-[220px] rounded-control border border-line p-2 ${isToday(day) ? "ring-2 ring-inset ring-amber-500" : ""}`}
                    >
                      <div className="mb-2 text-xs font-medium">
                        {day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </div>
                      <div className="space-y-1">
                        {weekEvents.map((ev) => (
                          <div
                            key={ev.id}
                            draggable={ev.entityType === "servico"}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/event-id", ev.id);
                              setDraggingEventId(ev.id);
                            }}
                            onDragEnd={() => setDraggingEventId(null)}
                            className={`cursor-move rounded-control bg-accent px-2 py-1 text-xs text-accent-fg transition-opacity duration-150 ${draggingEventId === ev.id ? "opacity-50" : ""}`}
                            title={`${ev.title} (${new Date(ev.start).toLocaleString("pt-BR")})`}
                          >
                        <Link href={ev.href} className="block">
                              <div className="truncate font-medium">{ev.title}</div>
                              <div className="opacity-90">
                                {new Date(ev.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "month" && (
              <div className="grid grid-cols-7 gap-2">
                {grid.map((day) => {
                  const k = dayKey(day);
                  const monthEvents = eventsByDay.get(k) || [];
                  const isCurrentMonth = day.getMonth() === cursor.getMonth();
                  return (
                    <div
                      key={k}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const eventId = e.dataTransfer.getData("text/event-id");
                        if (!eventId) return;
                        await moveEvent(eventId, day);
                        setDraggingEventId(null);
                      }}
                      className={`min-h-[120px] rounded-control border p-2 ${isCurrentMonth ? "border-line" : "border-line opacity-50"} ${isToday(day) ? "ring-2 ring-inset ring-amber-500" : ""}`}
                    >
                      <div className="mb-2 text-xs font-medium">{day.getDate()}</div>
                      <div className="space-y-1">
                        {monthEvents.map((ev) => (
                          <div
                            key={ev.id}
                            draggable={ev.entityType === "servico"}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/event-id", ev.id);
                              setDraggingEventId(ev.id);
                            }}
                            onDragEnd={() => setDraggingEventId(null)}
                            className={`cursor-move rounded-control bg-accent px-2 py-1 text-xs text-accent-fg transition-opacity duration-150 ${draggingEventId === ev.id ? "opacity-50" : ""}`}
                            title={`${ev.title} (${new Date(ev.start).toLocaleString("pt-BR")})`}
                          >
                            <Link href={ev.href} className="block">
                              <div className="truncate font-medium">{ev.title}</div>
                              <div className="opacity-90">
                                {new Date(ev.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

