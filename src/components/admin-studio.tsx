"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminWorkspace } from "./admin-workspace";
import { AdminPhase2 } from "./admin-phase2";
import { AdminCustomRequests } from "./admin-custom";
import { AdminAudit } from "./admin-audit";
import { privateRequest } from "@/lib/client-request";
export function AdminStudio({
  phase2,
  phase3,
  security,
}: {
  phase2: boolean;
  phase3: boolean;
  security: ReactNode;
}) {
  const sections = [
    {
      id: "home",
      title: "Overview",
      description: "Choose the work you want to do.",
    },
    {
      id: "catalogue",
      title: "Catalogue",
      description: "Manage gifts, photos, categories and shop settings.",
    },
    ...(phase2
      ? [
          {
            id: "community",
            title: "Trust and enquiries",
            description:
              "Review customer submissions, business enquiries and approved sales proof.",
          },
        ]
      : []),
    ...(phase3
      ? [
          {
            id: "custom",
            title: "Custom gift requests",
            description:
              "Review private plans, prepare quotes and record genuine agreements.",
          },
        ]
      : []),
    {
      id: "audit",
      title: "Owner audit",
      description: "Search recorded actions without exposing private payloads.",
    },
    {
      id: "security",
      title: "Security",
      description:
        "Verify the authenticator and manage the existing backup factor.",
    },
  ];
  const [active, setActive] = useState("home"),
    [visited, setVisited] = useState<string[]>(["home"]),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    first = useRef(true);
  useEffect(() => {
    if (first.current && active === "home") {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [active]);
  function open(id: string) {
    setVisited((rows) => (rows.includes(id) ? rows : [...rows, id]));
    setActive(id);
  }
  const current = sections.find((s) => s.id === active) ?? sections[0];
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <nav aria-label="Studio workspace navigation">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={active === s.id}
              aria-controls={`studio-panel-${s.id}`}
              onClick={() => open(s.id)}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setStatus("");
            try {
              await privateRequest("/api/auth/logout", { everywhere: false });
              window.location.reload();
            } catch (e) {
              setStatus(
                e instanceof Error
                  ? e.message
                  : "Sign-out failed. Please retry.",
              );
              setBusy(false);
            }
          }}
        >
          Sign out of Studio
        </button>
        <p role="status">{status}</p>
      </aside>
      <div className="studio-main">
        <header className="studio-section-header">
          <h2 ref={heading} tabIndex={-1}>
            {current.title}
          </h2>
          <p>{current.description}</p>
        </header>
        <section
          id="studio-panel-home"
          aria-label="Studio overview"
          hidden={active !== "home"}
        >
          <div className="studio-shortcuts">
            {sections
              .filter((s) => s.id !== "home")
              .map((s) => (
                <button
                  type="button"
                  className="studio-shortcut"
                  key={s.id}
                  onClick={() => open(s.id)}
                >
                  <strong>{s.title}</strong>
                  <span>{s.description}</span>
                </button>
              ))}
          </div>
          <p className="quiet-note">
            Private drafts and photographs appear publicly only after explicit
            publication. Opening a message link does not record a sale, payment
            or delivery.
          </p>
        </section>
        {sections
          .filter((s) => s.id !== "home")
          .map((s) => (
            <section
              key={s.id}
              id={`studio-panel-${s.id}`}
              aria-label={s.title}
              hidden={active !== s.id}
            >
              {visited.includes(s.id) &&
                (s.id === "catalogue" ? (
                  <AdminWorkspace embedded />
                ) : s.id === "community" ? (
                  <AdminPhase2 />
                ) : s.id === "custom" ? (
                  <AdminCustomRequests />
                ) : s.id === "audit" ? (
                  <AdminAudit />
                ) : (
                  security
                ))}
            </section>
          ))}
      </div>
    </div>
  );
}
