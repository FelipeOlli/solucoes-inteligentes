"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, RotateCcw, Power } from "lucide-react";

type AgendaEvent = {
  id: string;
  title: string;
  descricao: string;
  statusAtual: string;
  start: string;
  end: string;
  categoria: string | null;
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

function monthBounds(base: Date) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

function dayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  const [monthDirection, setMonthDirection] = useState(1);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [google, setGoogle] = useState<GoogleStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const bounds = useMemo(() => monthBounds(cursor), [cursor]);
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
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
  }, [cursor]);

  async function moveEvent(eventId: string, targetDay: Date) {
    const current = events.find((e) => e.id === eventId);
    if (!current) return;
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

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

  return (
    <div className="text-theme space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary">Agenda</h1>
          <p className="text-sm text-theme-muted">Arraste os serviços entre os dias para reagendar rapidamente.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMonthDirection(-1);
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
            }}
            className="px-3 py-2 rounded-lg border border-theme bg-theme-card"
          >
            Mês anterior
          </button>
          <button
            type="button"
            onClick={() => {
              setMonthDirection(0);
              setCursor(new Date());
            }}
            className="px-3 py-2 rounded-lg border border-theme bg-theme-card"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => {
              setMonthDirection(1);
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
            }}
            className="px-3 py-2 rounded-lg border border-theme bg-theme-card"
          >
            Próximo mês
          </button>
        </div>
      </div>

      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-theme-primary">Google Agenda</h2>
            <p className="text-sm text-theme-muted">
              {google.connected
                ? `Conectado (${google.integration?.accountEmail || "conta da empresa"})`
                : "Não conectado"}
            </p>
            {google.integration?.lastSyncedAt && (
              <p className="text-xs text-theme-muted">
                Última sincronização: {new Date(google.integration.lastSyncedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!google.connected ? (
              <button
                type="button"
                onClick={connectGoogle}
                className="px-3 py-2 bg-primary text-white rounded-lg"
              >
                Conectar Google
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => resyncGoogle("resync")}
                  title="Sincronizar agora"
                  aria-label="Sincronizar agora"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-theme bg-theme-card hover:opacity-90"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => resyncGoogle("restart_watch")}
                  title="Reiniciar webhook"
                  aria-label="Reiniciar webhook"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-theme bg-theme-card hover:opacity-90"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={disconnectGoogle}
                  title="Desconectar Google"
                  aria-label="Desconectar Google"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-red-600 text-white hover:opacity-90"
                >
                  <Power className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-theme-primary capitalize">{monthLabel}</h3>
          {loading && <span className="text-sm text-theme-muted">Carregando…</span>}
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs uppercase text-theme-muted mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
            <div key={w} className="px-2">{w}</div>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={monthKey}
            initial={{ opacity: 0, x: monthDirection < 0 ? -20 : monthDirection > 0 ? 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: monthDirection < 0 ? 20 : monthDirection > 0 ? -20 : 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-7 gap-2"
          >
            {grid.map((day) => {
              const k = dayKey(day);
              const dayEvents = eventsByDay.get(k) || [];
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
                  className={`min-h-[120px] rounded-lg border p-2 ${isCurrentMonth ? "border-theme" : "border-theme opacity-50"}`}
                >
                  <div className="text-xs mb-2 font-medium">{day.getDate()}</div>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/event-id", ev.id);
                          setDraggingEventId(ev.id);
                        }}
                        onDragEnd={() => setDraggingEventId(null)}
                        className={`rounded px-2 py-1 text-xs cursor-move transition-opacity duration-150 ${draggingEventId === ev.id ? "opacity-50" : ""}`}
                        style={{ backgroundColor: "var(--color-secondary)", color: "var(--color-cta-text)" }}
                        title={`${ev.title} (${new Date(ev.start).toLocaleString("pt-BR")})`}
                      >
                        <Link href={`/dashboard/servicos/${ev.id}`} className="block">
                          <div className="font-medium truncate">{ev.title}</div>
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
          </motion.div>
        </AnimatePresence>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}

