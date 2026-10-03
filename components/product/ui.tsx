"use client";
// product-localization-applied
import {ProductText,useProductLocale} from './locale';
import { useEffect, useRef, type ReactNode } from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    Overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    Customers:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4",
    Leads: "M4 4h16v4l-6 6v6l-4-2v-4L4 8z",
    Calendar: "M4 5h16v16H4z M16 3v4 M8 3v4 M4 11h16",
    Tasks: "M9 5h12 M9 12h12 M9 19h12 M2 5l2 2 3-4 M2 12l2 2 3-4 M2 19l2 2 3-4",
    Invoices: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",
    Payments: "M3 6h18v12H3z M3 10h18 M6 15h3",
    Analytics: "M4 3v18h17 M8 16v-5 M13 16V7 M18 16V4",
    Automation: "M13 2L4 14h7l-1 8 10-12h-7z",
    Settings:
      "M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
    Organizations:
      "M3 21V7h8v14 M11 21V3h10v18 M1 21h22 M6 11h2 M6 15h2 M15 7h2 M15 11h2 M15 15h2",
    Search: "M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14 M15 15l6 6",
    Bell: "M6 8a6 6 0 0 1 12 0v7l2 3H4l2-3z M10 21h4",
    Menu: "M3 6h18 M3 12h18 M3 18h18",
    Close: "M5 5l14 14 M19 5L5 19",
    Plus: "M12 5v14 M5 12h14",
    Arrow: "M5 12h14 M13 6l6 6-6 6",
    Check: "M5 12l4 4L19 6",
    Users:
      "M4 21v-3a5 5 0 0 1 10 0v3 M9 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M18 8h4 M20 6v4",
    Modules: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    Audit: "M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5",
    System: "M3 4h18v12H3z M8 21h8 M12 16v5",
    Usage: "M4 19h16 M7 15V9 M12 15V4 M17 15v-3",
    Support:
      "M4 14v-2a8 8 0 0 1 16 0v2 M4 12h3v7H4z M17 12h3v7h-3z M17 19l-4 3",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.Overview} />
    </svg>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const {t}=useProductLocale();

  return (
    <span
      className={`pq-badge pq-badge-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      {t(status)}
    </span>
  );
}
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  const {t}=useProductLocale();

  return (
    <header className="pq-page-header">
      <div>
        <h1 tabIndex={-1}>{t(title)}</h1>
        <p>{t(subtitle)}</p>
      </div>
      <div className="pq-actions">{action}</div>
    </header>
  );
}
export function MetricCard({
  label,
  value,
  detail,
  positive = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  positive?: boolean;
}) {
  const {t}=useProductLocale();

  return (
    <article className="pq-metric">
      <p>{t(label)}</p>
      <strong>{typeof value==='string'?t(value):value}</strong>
      <span className={positive ? "pq-positive" : "pq-muted"}>{t(detail)}</span>
    </article>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const {t}=useProductLocale();

  return (
    <section className={`pq-card ${className}`}>
      <div className="pq-card-header">
        <div>
          <h2>{t(title)}</h2>
          {subtitle && <p>{t(subtitle)}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function SearchInput({
  value,
  onChange,
  label = "Search customers",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const {t}=useProductLocale();

  return (
    <label className="pq-search">
      <Icon name="Search" />
      <span className="pq-sr-only">{t(label)}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(label)}
      />
    </label>
  );
}
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="pq-filter-bar">{children}</div>;
}
export function Tabs({
  values,
  active,
  onChange,
}: {
  values: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  const {t}=useProductLocale();

  return (
    <div className="pq-tabs" aria-label={t("View selection")}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={active === value}
          onClick={() => onChange(value)}
        >
          {t(value)}
        </button>
      ))}
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  detail = "Create your first record to get started.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  const {t}=useProductLocale();

  return (
    <div className="pq-empty">
      <Icon name="Overview" size={28} />
      <h3>{t(title)}</h3>
      <p>{t(detail)}</p>
      {action}
    </div>
  );
}
export function DataTable({
  columns,
  rows,
  label,
}: {
  columns: string[];
  rows: { id: string; cells: ReactNode[] }[];
  label: string;
}) {
  const {t}=useProductLocale();

  return rows.length ? (
    <div
      className="pq-table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${t(label)}, ${t('scrollable table')}`}
    >
      <table>
        <caption className="pq-sr-only">{t(label)}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {t(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState
      title="No matching records"
      detail="Try a different filter or create a record in this demo workspace."
    />
  );
}
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const {t}=useProductLocale();

  return (
    <fieldset className="pq-form-section">
      <legend>{t(title)}</legend>
      <div className="pq-form-grid">{children}</div>
    </fieldset>
  );
}
export function Modal({
  title,
  close,
  children,
  drawer = false,
  translateTitle = true,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  drawer?: boolean;
  translateTitle?: boolean;
}) {
  const {t}=useProductLocale();

  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`pq-dialog ${drawer ? "pq-drawer" : ""}`}
      aria-labelledby="pq-dialog-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="pq-dialog-header">
        <h2 id="pq-dialog-title">{translateTitle ? t(title) : title}</h2>
        <button
          className="pq-icon-button"
          aria-label={t("Close dialog")}
          onClick={close}
        >
          <Icon name="Close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="pq-avatar" aria-hidden="true">
      {name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")}
    </span>
  );
}
export function TrendChart({ empty = false,series }: { empty?: boolean;series?:Array<{label:string;value:number}> }) {
  const {t}=useProductLocale();
  if(series){
    const max=Math.max(100,...series.map(point=>point.value));
    const points=series.map((point,i)=>`${55+i*110},${185-point.value/max*150}`).join(' ');
    return <div className="pq-chart"><div className="pq-chart-legend"><span>{t('Collected revenue')}</span><span>{t('Recorded payments · USD / UTC')}</span></div><svg viewBox="0 0 660 220" role="img" aria-label={t('Recorded payment trend')}>
    {[0,1,2,3].map(i=><g key={i}><line x1="45" x2="635" y1={35+i*50} y2={35+i*50} stroke="#e9edf2"/><text x="0" y={39+i*50} fill="#657083" fontSize="11">${Math.round(max/100*(1-i/3))}</text></g>)}
    <polyline points={points} stroke="#4f46b4" strokeWidth="3" fill="none"/>
    {series.map((point,i)=><g key={point.label}><circle cx={55+i*110} cy={185-point.value/max*150} r="4" fill="white" stroke="#4f46b4" strokeWidth="2"><title>{`${point.label}: USD ${point.value/100}`}</title></circle><text x={55+i*110} y="212" textAnchor="middle" fill="#657083" fontSize="11">{point.label}</text></g>)}
    </svg></div>;
  }

  return (
    <div className="pq-chart">
      <div className="pq-chart-legend">
        <span>
          <i /> <ProductText text={"Collected revenue"} /></span>
        <span><ProductText text={"USD · synthetic monthly history"} /></span>
      </div>
      <svg
        viewBox="0 0 660 220"
        role="img"
        aria-label={
          empty
            ? "No revenue history in the empty sandbox"
            : "Demo collected revenue: May 2400, June 3200, July 2900, August 4100, September 4800. October is shown separately in metrics."
        }
      >
        {[35, 85, 135, 185].map((y, i) => (
          <g key={y}>
            <line x1="45" x2="635" y1={y} y2={y} stroke="#e9edf2" />
            <text x="0" y={y + 4} fill="#657083" fontSize="11">
              {["$6k", "$4k", "$2k", "$0"][i]}
            </text>
          </g>
        ))}
        {!empty && (
          <>
            <path
              d="M55 125 L195 105 L335 113 L475 83 L620 65 L620 185 L55 185Z"
              fill="#eef2ff"
            />
            <path
              d="M55 125 L195 105 L335 113 L475 83 L620 65"
              stroke="#4f46b4"
              strokeWidth="3"
              fill="none"
            />
            {[
              [55, 125],
              [195, 105],
              [335, 113],
              [475, 83],
              [620, 65],
            ].map(([x, y]) => (
              <circle
                key={x}
                cx={x}
                cy={y}
                r="4"
                fill="white"
                stroke="#4f46b4"
                strokeWidth="2"
              />
            ))}
          </>
        )}
        {["May", "Jun", "Jul", "Aug", "Sep"].map((m, i) => (
          <text
            key={m}
            x={55 + i * 140}
            y="212"
            textAnchor="middle"
            fill="#657083"
            fontSize="12"
          >
            {t(m)}
          </text>
        ))}
      </svg>
    </div>
  );
}
