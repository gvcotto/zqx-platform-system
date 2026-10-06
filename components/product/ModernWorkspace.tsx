"use client";
// product-localization-applied
import {ProductText,useProductLocale} from './locale';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  balance,
  customerName,
  DEMO_DATE,
  DEMO_STORAGE_KEY,
  emptyStore,
  money,
  organizations as demoOrganizations,
  paidAmount,
  restoreStore,
  saveRecord,
  seedDemo,
  storeSchema,
  type DemoStore,
  type Entity,
} from "@/lib/demo/model";
import { AppShell, OrganizationBrand } from "./shell";
import {ProductLocaleProvider,translateProduct} from './locale';
import {calendarRange,revenueSeries} from '@/lib/application/workspace-calendar';
import type { WorkspaceOrganization } from "@/lib/application/workspace";
import { ActivityFeed } from "./activity";
import {
  Avatar,
  Card,
  DataTable,
  EmptyState,
  FilterBar,
  FormSection,
  Icon,
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  Tabs,
  TrendChart,
} from "./ui";

const descriptions: Record<string, string> = {
  Overview: "Customers, scheduled work and outstanding balances.",
  Customers: "Contact details, status and follow-ups.",
  Leads: "Pipeline stage, owner and next action.",
  Calendar: "Customer appointments and upcoming work.",
  Tasks: "Due dates, priorities and completion status.",
  Invoices: "Track what’s billed, collected and still outstanding.",
  Payments: "A clear record of incoming payments.",
  Analytics: "Payments and operational activity in this workspace.",
  Automation: "Manual reminders and planned workflows.",
  Settings: "Workspace identity and configuration.",
  Organizations: "A dedicated home for every client organization.",
  Users: "People and access, clearly organized.",
  Modules: "Modular experiences for different business needs.",
  Usage: "An illustrative view of workspace activity.",
  Audit: "Recorded administrative and data activity.",
  System: "Product availability at a glance.",
  Support: "Support workflow availability.",
};
const entityForPage: Record<string, Entity> = {
  Customers: "customers",
  Leads: "leads",
  Calendar: "appointments",
  Tasks: "tasks",
  Invoices: "invoices",
  Payments: "payments",
};
const actionLabels: Record<Entity, string> = {
  customers: "New customer",
  leads: "New lead",
  appointments: "New appointment",
  tasks: "New task",
  invoices: "New invoice",
  payments: "Record payment",
};
type Editor = { entity: Entity; id?: string };
export default function ModernWorkspace(props: Parameters<typeof ModernWorkspaceContent>[0]) {
 return <ProductLocaleProvider><ModernWorkspaceContent {...props}/></ProductLocaleProvider>;
}
function ModernWorkspaceContent({
  authenticatedDemo = false,
  initialStore,
  persistence = "demo",
  remoteOrganizations,
  remoteUser,
  platformOwner = false,
  currentDate = DEMO_DATE,
}: {
  authenticatedDemo?: boolean;
  initialStore?: DemoStore;
  persistence?: "demo" | "postgres" | "remote";
  remoteOrganizations?:WorkspaceOrganization[];
  remoteUser?:{id:string;name:string};
  platformOwner?:boolean;
  currentDate?:string;
}) {
  const {t,locale}=useProductLocale();
  const dateLabel=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString(locale==='es'?'es-GT':'en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  const range=calendarRange(currentDate);

  const organizations=remoteOrganizations??demoOrganizations;
  const initialOrg=remoteOrganizations?.[0]?.id??"studio";
  const [stores, setStores] = useState<Record<string, DemoStore>>({
    [initialOrg]: persistence !== "demo" ? storeSchema.parse(initialStore) : seedDemo(),
    sandbox: emptyStore(),
  });
  const [org, setOrg] = useState(initialOrg);
  const [page, setPage] = useState("Overview");
  const [control, setControl] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState("Open");
  const [sort, setSort] = useState("Name A–Z");
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [detail, setDetail] = useState("");
  const [detailTab, setDetailTab] = useState("Summary");
  const [orgDetail, setOrgDetail] = useState("");
  const [orgTab, setOrgTab] = useState("Overview");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const mutationPending=useRef(false);
  const store = stores[org];
  const readOnly=persistence==='remote'&&remoteOrganizations?.find(item=>item.id===org)?.canWrite===false;
  useEffect(() => {
    try {
      if (persistence === "demo") {
      const studio = restoreStore(
        sessionStorage.getItem(`${DEMO_STORAGE_KEY}.studio`),
      );
      const sandbox = restoreStore(
        sessionStorage.getItem(`${DEMO_STORAGE_KEY}.sandbox`),
      );
      if (studio || sandbox)
        setStores({
          studio: studio || seedDemo(),
          sandbox: sandbox || emptyStore(),
        });
      }
    } catch {
      /* Browser storage may be disabled; remain explicit session-memory demo. */
    }
    const sync = () => {
      const raw = location.hash.slice(1);
      const admin = (persistence === "demo" || (persistence === "remote" && platformOwner)) && raw.startsWith("control/");
      const slug = raw.replace("control/", "");
      const allowed = admin
        ? [
            "overview",
            "organizations",
            "users",
            "modules",
            "usage",
            "audit",
            "system",
            "support",
          ]
        : [
            "overview",
            "customers",
            "leads",
            "calendar",
            "tasks",
            "invoices",
            "payments",
            "analytics",
            "automation",
            "settings",
          ];
      setControl(admin);
      setView(slug === "calendar" ? "Today" : "Open");
      setPage(
        allowed.includes(slug)
          ? slug[0].toUpperCase() + slug.slice(1)
          : "Overview",
      );
    };
    sync();
    window.addEventListener("hashchange", sync);
    setLoaded(true);
    return () => window.removeEventListener("hashchange", sync);
  }, [persistence,platformOwner]);
  useEffect(() => {
    if (loaded && persistence === "demo")
      try {
        Object.entries(stores).forEach(([id, data]) =>
          sessionStorage.setItem(
            `${DEMO_STORAGE_KEY}.${id}`,
            JSON.stringify(data),
          ),
        );
      } catch {
        setNotice(
          "Browser storage is unavailable. Demo changes last until this page is reloaded.",
        );
      }
  }, [stores, loaded, persistence]);
  function navigate(next: string, admin = control) {
    if ((persistence === "postgres" || (persistence === "remote"&&!platformOwner)) && admin) {
      setNotice("Control Center remains a separate demo preview at /demo. Local operator has no platform role.");
      return;
    }
    setPage(next);
    setControl(admin);
    setSearch("");
    setFilter("All");
    setOffset(0);
    setView(next === "Calendar" ? "Today" : "Open");
    setDetail("");
    setEditor(null);
    setOrgDetail("");
    location.hash = `${admin ? "control/" : ""}${next.toLowerCase()}`;
  }
  function switchOrg(id: string) {
    if(persistence==="remote"){
      if(!organizations.some(o=>o.id===id)) return;
      void fetch(`/api/workspace?organizationId=${encodeURIComponent(id)}`).then(async response=>{
        if(!response.ok) throw new Error("Organization access unavailable.");
        const data=storeSchema.parse(await response.json());
        setStores(current=>({...current,[id]:data}));setOrg(id);setDetail("");setEditor(null);setNotice("Workspace changed.");
      }).catch(()=>setNotice("Organization access unavailable."));
      return;
    }
    if (persistence === "postgres") {
      setNotice("Local identity is assigned to Forma Advisory only. Simulated switching is disabled.");
      return;
    }
    if (!organizations.some((o) => o.id === id)) return;
    setOrg(id);
    setDetail("");
    setEditor(null);
    setOffset(0);
    setSearch("");
    setFilter("All");
    setNotice("Demo workspace changed. This is not production authorization.");
  }
  async function save(entity: Entity, raw: unknown):Promise<boolean> {
    if(readOnly){setNotice('Read-only workspace.');return false;}
    if (persistence !== "demo") {
      if(mutationPending.current) return false;
      mutationPending.current=true;
      try {
      const response=await fetch(persistence==="remote"?"/api/workspace":"/api/local-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: persistence==="remote"?org:"30000000-0000-0000-0000-000000000001", entity, record: raw }),
      });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Database unavailable.");
        setStores(current => ({...current, [org]: storeSchema.parse(result)}));
        // Do not close a different form opened while this request was in flight.
        setEditor(current => current === editor ? null : current);
        setNotice(persistence==="remote"?"Saved to your workspace.":"Saved to local PostgreSQL. No production data changed.");
        return true;
      }catch(error){setNotice(error instanceof Error ? error.message : "Database unavailable.");return false;}
      finally{mutationPending.current=false;}
    }
    const next = saveRecord(store, entity, raw);
    setStores({ ...stores, [org]: next });
    setEditor(null);
    setNotice("Saved to this demo workspace. No production data was changed.");
    return true;
  }
  const edit = (entity: Entity, id?: string) => {if(readOnly){setNotice('Read-only workspace.');return;}setEditor({ entity, id });};
  const customerLink = (id: string) => (
    <button
      className="pq-text-button"
      onClick={() => {
        setDetail(id);
        setDetailTab("Summary");
      }}
    >
      {customerName(store, id)}
    </button>
  );
  const openTasks = store.tasks.filter((t) => t.status === "Open");
  const upcoming = store.appointments
    .filter((a) => a.date >= currentDate && a.status === "Scheduled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const monthRevenue = store.payments
    .filter((p) => p.date.startsWith(currentDate.slice(0,7)))
    .reduce((n, p) => n + p.amount, 0);
  const btn = (label: string, fn: () => void, primary = false) => (
    <button className={`pq-button ${primary ? "pq-primary" : ""}`} onClick={fn}>
      <Icon name="Plus" size={16} />
      {t(label)}
    </button>
  );
  const metrics = (
    <div className="pq-metrics">
      <MetricCard
        label="Total customers"
        value={store.customers.length}
        detail={`${store.customers.filter((c) => c.status === "Active").length} active relationships`}
      />
      <MetricCard
        label="Active leads"
        value={
          store.leads.filter((l) => !["Won", "Lost"].includes(l.status)).length
        }
        detail="Across your sales pipeline"
      />
      <MetricCard
        label="Collected this month"
        value={money(monthRevenue)}
        detail={persistence==='remote'?currentDate.slice(0,7)+' · UTC':"October · demo payments"}
        positive
      />
      <MetricCard
        label="Outstanding balance"
        value={money(balance(store))}
        detail="Issued invoices only"
      />
    </div>
  );
  function overview() {
    return (
      <>
        {metrics}
        <div className="pq-secondary-metrics">
          <span>
            <strong>{upcoming.length}</strong> <ProductText text={"Upcoming appointments"} /></span>
          <span>
            <strong>{openTasks.length}</strong> <ProductText text={"Open tasks"} /></span>
          <span>
            <strong>{store.activities.length}</strong> <ProductText text={"Recent activities"} /></span>
        </div>
        <div className="pq-dashboard-grid">
          <Card
            title="Revenue trend"
            subtitle={persistence==='remote'?"Recorded payments · USD / UTC":"A five-month look at collected revenue"}
            action={<StatusBadge status={persistence==='remote'?'Current':'Demo'} />}
          >
            <TrendChart empty={org === "sandbox"} series={persistence==='remote'?revenueSeries(store,currentDate):undefined}/>
          </Card>
          <Card
            title="Coming up"
            subtitle={dateLabel(currentDate)+' · UTC'}
            action={
              <button
                className="pq-text-button"
                onClick={() => navigate("Calendar")}
              >
                <ProductText text={"View calendar"} /><Icon name="Arrow" size={14} />
              </button>
            }
          >
            <div className="pq-agenda-list">
              {upcoming.slice(0, 3).map((a) => (
                <button
                  className="pq-agenda-item"
                  key={a.id}
                  onClick={() => edit("appointments", a.id)}
                >
                  <time>
                    {a.time}
                    <small>{dateLabel(a.date)}</small>
                  </time>
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {customerName(store, a.customerId)} · {a.duration} <ProductText text={"min"} /></small>
                  </span>
                  <span className="pq-agenda-dot" />
                </button>
              ))}
              {!upcoming.length && (
                <EmptyState
                  title="Your schedule is clear"
                  detail="Add an appointment when you’re ready."
                />
              )}
            </div>
            <div className="pq-card-footer">
              <span>{openTasks.length} <ProductText text={"tasks need your attention"} /></span>
              <button
                className="pq-text-button"
                onClick={() => navigate("Tasks")}
              >
                <ProductText text={"View tasks →"} /></button>
            </div>
          </Card>
        </div>
        <div className="pq-dashboard-lower">
          <Card
            title="Your customers"
            subtitle="Contact details and next action"
            action={
              <button
                className="pq-text-button"
                onClick={() => navigate("Customers")}
              >
                <ProductText text={"View all →"} /></button>
            }
          >
            <DataTable
              label="Recent customers"
              columns={["Customer", "Status", "Next step"]}
              rows={store.customers.slice(0, 4).map((c) => ({
                id: c.id,
                cells: [
                  <div className="pq-person" key="name">
                    <Avatar name={c.name} />
                    <div>
                      {customerLink(c.id)}
                      <small>{c.company}</small>
                    </div>
                  </div>,
                  <StatusBadge status={c.status} key="status" />,
                  store.tasks.find(
                    (t) => t.customerId === c.id && t.status === "Open",
                  )?.title || t("No open tasks"),
                ],
              }))}
            />
          </Card>
          <Card title="Recent activity" subtitle="The latest in your workspace">
            <ActivityFeed store={store} />
          </Card>
        </div>
      </>
    );
  }
  function customers() {
    const filtered = store.customers
      .filter(
        (c) =>
          (c.name + " " + c.email + " " + c.company)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (filter === "All" || c.status === filter),
      )
      .sort((a, b) =>
        sort === "Name A–Z"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name),
      );
    return (
      <Card
        title="Customer directory"
        subtitle={`${filtered.length} relationships in this workspace`}
      >
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setOffset(0);
            }}
          />
          <label className="pq-select-label">
            <ProductText text={"Status"} /><select
              aria-label={t("Status")}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setOffset(0);
              }}
            >
              {["All", "Active", "Inactive"].map((v) => (
                <option value={v} key={v}>{t(v)}</option>
              ))}
            </select>
          </label>
          <label className="pq-select-label">
            <ProductText text={"Sort"} /><select
              aria-label={t("Sort")}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="Name A–Z"><ProductText text={"Name A–Z"} /></option>
              <option value="Name Z–A"><ProductText text={"Name Z–A"} /></option>
            </select>
          </label>
        </FilterBar>
        <DataTable
          label="Customers"
          columns={["Customer", "Contact", "Status", "Open tasks", "Actions"]}
          rows={filtered.slice(offset, offset + 6).map((c) => ({
            id: c.id,
            cells: [
              <div className="pq-person" key="name">
                <Avatar name={c.name} />
                <div>
                  {customerLink(c.id)}
                  <small>{c.company}</small>
                </div>
              </div>,
              c.email,
              <StatusBadge status={c.status} key="status" />,
              store.tasks.filter(
                (t) => t.customerId === c.id && t.status === "Open",
              ).length,
              <button
                className="pq-text-button"
                key="edit"
                aria-label={`${t('Edit')} ${c.name}`}
                onClick={() => edit("customers", c.id)}
              >
                <ProductText text={"Edit"} /></button>,
            ],
          }))}
        />
        <div className="pq-pagination">
          <span>
            {filtered.length ? offset + 1 : 0}–
            {Math.min(offset + 6, filtered.length)} <ProductText text={"of"} />{filtered.length}{" "}
            <ProductText text={"customers"} /></span>
          <div>
            <button
              className="pq-button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 6))}
            >
              <ProductText text={"Previous"} /></button>
            <button
              className="pq-button"
              disabled={offset + 6 >= filtered.length}
              onClick={() => setOffset(offset + 6)}
            >
              <ProductText text={"Next"} /></button>
          </div>
        </div>
      </Card>
    );
  }
  function leads() {
    return (
      <>
        <div className="pq-pipeline">
          {["New", "Contacted", "Qualified", "Won", "Lost"].map((status) => (
            <button
              key={status}
              aria-pressed={filter === status}
              onClick={() => setFilter(filter === status ? "All" : status)}
            >
              <StatusBadge status={status} />
              <strong>
                {store.leads.filter((l) => l.status === status).length}
              </strong>
            </button>
          ))}
        </div>
        <Card
          title="Lead pipeline"
          subtitle="A lightweight view of your next opportunities"
        >
          <FilterBar>
            <SearchInput
              label="Search leads"
              value={search}
              onChange={setSearch}
            />
            <span className="pq-muted">
              {t(filter === "All" ? "All stages" : filter)}
            </span>
          </FilterBar>
          <DataTable
            label="Leads"
            columns={["Lead", "Stage", "Next action", "Owner", "Actions"]}
            rows={store.leads
              .filter(
                (l) =>
                  (filter === "All" || l.status === filter) &&
                  l.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((l) => ({
                id: l.id,
                cells: [
                  <div key="name">
                    <strong>{l.name}</strong>
                    <small>{l.company}</small>
                  </div>,
                  <StatusBadge key="status" status={l.status} />,
                  l.nextAction,
                  l.owner,
                  <button
                    key="edit"
                    className="pq-text-button"
                    onClick={() => edit("leads", l.id)}
                  >
                    <ProductText text={"Edit lead"} /></button>,
                ],
              }))}
          />
          <div className="pq-card-footer">
            <ProductText text={"Won leads are ready for customer onboarding. Automatic conversion is a future capability."} /></div>
        </Card>
      </>
    );
  }
  function calendar() {
    const entries = store.appointments
      .filter((a) =>
        view === "Today"
          ? a.date === currentDate
          : view === "Week"
            ? a.date >= range.start && a.date <= range.end
            : a.date >= currentDate,
      )
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return (
      <Card
        title="Your agenda"
        subtitle={persistence==='remote'?currentDate+' · UTC':"Demo dates anchored to October 2, 2026"}
        action={
          <Tabs
            values={["Today", "Week", "Upcoming"]}
            active={view}
            onChange={setView}
          />
        }
      >
        <div className="pq-calendar-layout">
          <aside className="pq-mini-calendar">
            <p>{new Date(currentDate+'T12:00:00Z').toLocaleDateString(locale==='es'?'es-GT':'en-US',{month:'long',year:'numeric',timeZone:'UTC'})}</p>
            <div className="pq-calendar-days">
              {(locale==='es'?["L","M","M","J","V","S","D"]:["M", "T", "W", "T", "F", "S", "S"]).map((d, i) => (
                <small key={i}>{d}</small>
              ))}
              {Array.from({ length: range.blanks }, (_, i) => (
                <span key={`blank${i}`} />
              ))}
              {Array.from({ length: range.days }, (_, i) => (
                <span key={i} className={i+1===Number(currentDate.slice(8)) ? "pq-selected-date" : ""}>
                  {i + 1}
                </span>
              ))}
            </div>
            <p className="pq-muted"><ProductText text={"Illustrative date picker"} /></p>
          </aside>
          <div className="pq-agenda-list pq-agenda-full">
            {entries.map((a) => (
              <div key={a.id} className="pq-agenda-item">
                <time>
                  {a.time}
                  <small>{dateLabel(a.date)}</small>
                </time>
                <div>
                  <button
                    className="pq-text-button"
                    onClick={() => edit("appointments", a.id)}
                  >
                    {a.title}
                  </button>
                  <small>
                    {customerLink(a.customerId)} · {a.duration} <ProductText text={"min"} /></small>
                </div>
                <StatusBadge status={a.status} />
                <button
                  className="pq-text-button"
                  aria-label={`${t('Edit')} ${a.title}`}
                  onClick={() => edit("appointments", a.id)}
                >
                  <ProductText text={"Edit"} /></button>
              </div>
            ))}
            {!entries.length && (
              <EmptyState title="No appointments in this view" />
            )}
          </div>
        </div>
      </Card>
    );
  }
  function tasks() {
    const rows = store.tasks.filter((t) =>
      view === "My tasks"
        ? t.assignee === "Demo operator"
        : view === "Completed"
          ? t.status === "Completed"
          : t.status === "Open",
    );
    return (
      <Card
        title="Task list"
            subtitle="Due dates, priorities and completion status."
        action={
          <Tabs
            values={["My tasks", "Open", "Completed"]}
            active={view}
            onChange={setView}
          />
        }
      >
        <div className="pq-task-list">
          {rows.map((t) => (
            <div className="pq-task-item" key={t.id}>
              <label className="pq-task-check">
                <input
                  type="checkbox"
                  checked={t.status === "Completed"}
                  aria-label={`${translateProduct('Complete',locale)} ${t.title}`}
                  onChange={() =>
                    save("tasks", {
                      ...t,
                      status: t.status === "Open" ? "Completed" : "Open",
                    })
                  }
                />
              </label>
              <div className="pq-task-copy">
                <button
                  className={`pq-text-button ${t.status === "Completed" ? "pq-completed" : ""}`}
                  onClick={() => edit("tasks", t.id)}
                >
                  {t.title}
                </button>
                <small>
                  {t.customerId ? customerLink(t.customerId) : "Internal task"}{" "}
                  · {t.assignee}
                </small>
              </div>
              <StatusBadge status={t.priority} />
              <time>{dateLabel(t.due)}</time>
              <button
                className="pq-text-button"
                aria-label={`${translateProduct('Edit',locale)} ${t.title}`}
                onClick={() => edit("tasks", t.id)}
              >
                <ProductText text={"Edit"} /></button>
            </div>
          ))}
          {!rows.length && (
            <EmptyState
              title="All clear"
              detail="There are no tasks in this view."
            />
          )}
        </div>
      </Card>
    );
  }
  function invoices() {
    return (
      <>
        <div className="pq-metrics pq-metrics-three">
          <MetricCard
            label="Issued amount"
            value={money(
              store.invoices
                .filter((i) => i.status !== "Draft")
                .reduce((n, i) => n + i.amount, 0),
            )}
            detail="Excludes draft invoices"
          />
          <MetricCard
            label="Collected"
            value={money(store.payments.reduce((n, p) => n + p.amount, 0))}
            detail={persistence==='demo'?"Recorded demo payments":"Recorded payments"}
            positive
          />
          <MetricCard
            label="Outstanding"
            value={money(balance(store))}
            detail="No tax or accounting logic"
          />
        </div>
        <Card title="Invoices" subtitle="Track the balance, not the paperwork">
          <FilterBar>
            <SearchInput
              label="Search invoices"
              value={search}
              onChange={setSearch}
            />
            <label className="pq-select-label">
              <ProductText text={"Status"} /><select
                aria-label={t("Status")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {["All", "Draft", "Pending", "Partial", "Paid", "Overdue"].map(
                  (s) => (
                    <option value={s} key={s}>{t(s)}</option>
                  ),
                )}
              </select>
            </label>
          </FilterBar>
          <DataTable
            label="Invoices"
            columns={[
              "Invoice",
              "Customer",
              "Amount",
              "Balance",
              "Due date",
              "Status",
              "Actions",
            ]}
            rows={store.invoices
              .filter(
                (i) =>
                  ((i.invoiceNumber || i.id) + customerName(store, i.customerId))
                    .toLowerCase()
                    .includes(search.toLowerCase()) &&
                  (filter === "All" || i.status === filter),
              )
              .map((i) => ({
                id: i.id,
                cells: [
                  <strong key="id">{i.invoiceNumber || i.id}</strong>,
                  customerLink(i.customerId),
                  money(i.amount),
                  money(i.amount - paidAmount(store, i.id)),
                  dateLabel(i.due),
                  <StatusBadge key="status" status={i.status} />,
                  i.status === "Draft" ? (
                    <button
                      className="pq-text-button"
                      key="issue"
                      onClick={() =>
                        save("invoices", { ...i, status: "Pending" })
                      }
                    >
                      <ProductText text={"Issue invoice"} /></button>
                  ) : i.status !== "Paid" ? (
                    <button
                      className="pq-text-button"
                      key="pay"
                      aria-label={`${t('Record payment for')} ${i.invoiceNumber || i.id}`}
                      onClick={() => edit("payments", i.id)}
                    >
                      <ProductText text={"Record payment"} /></button>
                  ) : (
                    "—"
                  ),
                ],
              }))}
          />
        </Card>
      </>
    );
  }
  function payments() {
    return (
      <>
        <div className="pq-metrics pq-metrics-three">
          <MetricCard
            label="Received this month"
            value={money(monthRevenue)}
            detail={persistence==='remote'?currentDate.slice(0,7)+' · UTC':"October · demo only"}
          />
          <MetricCard
            label="Transactions"
            value={store.payments.length}
            detail="Manually recorded"
          />
          <MetricCard
            label="Payment methods"
            value={new Set(store.payments.map((p) => p.method)).size}
            detail="No gateway connected"
          />
        </div>
        <Card
          title="Payment history"
          subtitle="Recording a payment does not charge a card or move money"
        >
          <DataTable
            label="Payments"
            columns={[
              "Payment",
              "Customer",
              "Invoice",
              "Date",
              "Method",
              "Amount",
            ]}
            rows={store.payments.map((p) => ({
              id: p.id,
              cells: [
                <span key="payment" title={p.id}>{t('Payment')} {store.payments.indexOf(p)+1}</span>,
                customerLink(
                  store.invoices.find((i) => i.id === p.invoiceId)
                    ?.customerId || "",
                ),
                store.invoices.find(i=>i.id===p.invoiceId)?.invoiceNumber || p.invoiceId,
                dateLabel(p.date),
                p.method,
                <strong key="amount">{money(p.amount)}</strong>,
              ],
            }))}
          />
        </Card>
      </>
    );
  }
  function analytics() {
    const completed = store.tasks.filter(
      (t) => t.status === "Completed",
    ).length;
    return (
      <>
        {metrics}
        <div className="pq-dashboard-grid">
          <Card
            title="Collected revenue"
            subtitle={persistence==='demo'?"Synthetic history · not production reporting":"Recorded payments · USD / UTC"}
          >
            <TrendChart empty={org === "sandbox"} series={persistence==='remote'?revenueSeries(store,currentDate):undefined}/>
          </Card>
          <Card
            title="Work, at a glance"
            subtitle="Calculated from the current demo dataset"
          >
            <div className="pq-progress-list">
              {[
                ["Task completion", completed, store.tasks.length],
                [
                  "Completed appointments",
                  store.appointments.filter((a) => a.status === "Completed")
                    .length,
                  store.appointments.length,
                ],
                [
                  "Paid invoices",
                  store.invoices.filter((i) => i.status === "Paid").length,
                  store.invoices.length,
                ],
              ].map(([label, n, total]) => (
                <div key={label}>
                  <div>
                    <span>{t(String(label))}</span>
                    <strong>
                      {n} / {total}
                    </strong>
                  </div>
                  <progress
                    value={Number(n)}
                    max={Math.max(1, Number(total))}
                    aria-label={String(label)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="pq-dashboard-lower">
          <Card
            title="Customer relationships"
            subtitle="Current demo snapshot, not a historical growth series"
          >
            <MetricCard
              label="Active customers"
              value={
                store.customers.filter((c) => c.status === "Active").length
              }
              detail={`${store.customers.length} total customers`}
            />
          </Card>
          <Card
            title="Payment status"
            subtitle="Invoice distribution in this demo"
          >
            <div className="pq-status-summary">
              {["Draft", "Pending", "Partial", "Paid", "Overdue"].map((s) => (
                <div key={s}>
                  <StatusBadge status={s} />
                  <strong>
                    {store.invoices.filter((i) => i.status === s).length}
                  </strong>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </>
    );
  }
  function automation() {
    return (
      <>
        <div className="pq-info-strip">
          <Icon name="Automation" />
          <span>
            <ProductText text={"Start with a clear next step. External delivery and scheduled workflows are not active in this preview."} /></span>
        </div>
        <div className="pq-feature-grid">
          {[
            {
              name: "Appointment reminder",
              text: "Keep customers prepared for the next conversation.",
              icon: "Calendar",
              status: "Coming later",
            },
            {
              name: "Payment reminder",
              text: "A thoughtful nudge when a balance is outstanding.",
              icon: "Invoices",
              status: "Coming later",
            },
            {
              name: "Customer follow-up",
              text: "Create the next task while a conversation is fresh.",
              icon: "Tasks",
              status: "Available",
            },
            {
              name: "Lead follow-up",
              text: "Keep opportunities moving with a clear next action.",
              icon: "Leads",
              status: "Available",
            },
          ].map((a) => (
            <Card key={a.name} title={a.name} action={<Icon name={a.icon} />}>
              <div className="pq-feature-body">
                <p>{t(a.text)}</p>
                <StatusBadge status={a.status} />
                <button
                  className="pq-button"
                  disabled={a.status === "Coming later"}
                  onClick={() =>
                    a.icon === "Tasks" ? edit("tasks") : navigate("Leads")
                  }
                >
                  {t(a.status === "Available"
                    ? "Open manual action"
                    : "Planned workflow")}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
  function settings() {
    return (
      <div className="pq-settings-grid">
        <Card
          title="Workspace identity"
          subtitle="A foundation for future customer branding"
        >
          <div className="pq-settings-body">
            <OrganizationBrand name={organizations.find(o=>o.id===org)?.name||''} initials={organizations.find(o=>o.id===org)?.initials||''}/>
            <h3>{organizations.find((o) => o.id === org)?.name}</h3>
            <p><ProductText text={persistence==='demo'||organizations.find(o=>o.id===org)?.name==='ZQX Demo Workspace'?"Professional services · Demo workspace":"Connected workspace"} /></p>
            <div className="pq-setting-row">
              <span><ProductText text={"Workspace accent"} /></span>
              <span className="pq-color-swatch" /> <small><ProductText text={"ZQX indigo"} /></small>
            </div>
            <div className="pq-setting-row">
              <span><ProductText text={"Currency"} /></span>
              <strong><ProductText text={persistence==='demo'?"USD (demo)":"USD"} /></strong>
            </div>
            <div className="pq-setting-row">
              <span><ProductText text={"Organization branding"} /></span>
              <StatusBadge status="Coming later" />
            </div>
          </div>
        </Card>
        <Card
          title={persistence==='demo'?"Demo preferences":"Workspace access"}
          subtitle={persistence==='demo'?"Only synthetic browser-session data":"Verified identity and PostgreSQL"}
        >
          <div className="pq-settings-body">
            {persistence==='demo'?<><p>
              <ProductText text={"Your demo changes stay in this browser session. They do not create production users, memberships or records."} /></p>
            <button className="pq-button" onClick={() => setDetail("reset")}>
              <ProductText text={"Reset this demo workspace"} /></button>
            <p className="pq-muted">
              <ProductText text={"Identity, permissions and notification configuration will be connected to verified services in a later phase."} /></p></>:<><p>{t('Verified account. Access is enforced by the server.')}</p><p>{t('Full member administration is not yet available')}</p></>}
          </div>
        </Card>
      </div>
    );
  }
  function controlOverview() {
    return (
      <>
        <div className="pq-metrics">
          <MetricCard
            label="Organizations"
            value={2}
            detail="One populated demo + empty sandbox"
          />
          <MetricCard
            label="Users"
            value={4}
            detail="Synthetic role concepts"
          />
          <MetricCard
            label="Enabled modules"
            value={6}
            detail="Demo module catalogue"
          />
          <MetricCard
            label="Platform status"
            value="Preview"
            detail="No remote health claims"
          />
        </div>
        <div className="pq-dashboard-grid">
          <Card
            title="Organizations"
            subtitle="Governance, separate from customer operations"
            action={
              <button
                className="pq-text-button"
                onClick={() => navigate("Organizations")}
              >
                <ProductText text={"View all →"} /></button>
            }
          >
            {organizationTable()}
          </Card>
          <Card
            title="Administrative activity"
            subtitle="Synthetic examples, not a durable audit log"
          >
            <ActivityFeed administrative store={store} />
          </Card>
        </div>
        <div className="pq-info-strip">
          <Icon name="System" />
          <span>
            <ProductText text={"Control Center is a demo governance experience. Real organization provisioning and access policies are not enabled."} /></span>
        </div>
      </>
    );
  }
  function organizationTable() {
    return (
      <DataTable
        label="Organizations"
        columns={["Organization", "Status", "Modules", "Users", "Actions"]}
        rows={organizations.map((o) => ({
          id: o.id,
          cells: [
            <button
              key="name"
              className="pq-text-button"
              onClick={() => {
                setOrgDetail(o.id);
                setOrgTab("Overview");
              }}
            >
              {o.name}
              <small>{o.industry}</small>
            </button>,
            <StatusBadge key="status" status={o.status} />,
            o.modules,
            o.users,
            <button
              className="pq-text-button"
              key="open"
              onClick={() => {
                switchOrg(o.id);
                navigate("Overview", false);
              }}
            >
              <ProductText text={"Open workspace →"} /></button>,
          ],
        }))}
      />
    );
  }
  function controlPage(): ReactNode {
    if(persistence==="remote") {
      if(page==="Organizations") return <Card title="Organization directory" subtitle="Verified platform scope">{organizationTable()}</Card>;
      if(page==="Users") return <Card title="Current platform identity" subtitle="Full member administration is not yet available"><DataTable label="Current user" columns={["User","Role","Status"]} rows={[{id:remoteUser?.id||"current",cells:[remoteUser?.name||t("Current user"),t("Platform owner"),<StatusBadge key="s" status="Active"/>]}]}/></Card>;
      if(page==="Audit") return <Card title="Audit activity" subtitle="Sanitized database events for this workspace"><ActivityFeed administrative store={store}/></Card>;
      if(page==="Overview") return <><div className="pq-metrics"><MetricCard label="Organizations" value={organizations.length} detail="Verified platform scope"/><MetricCard label="Users" value={organizations.reduce((n,o)=>n+o.users,0)} detail="Active memberships"/><MetricCard label="Enabled modules" value={organizations.reduce((n,o)=>n+o.modules,0)} detail="Configured workspace modules"/><MetricCard label="Platform status" value="Connected" detail="Verified identity and PostgreSQL"/></div><Card title="Organizations" subtitle="Governance, separate from customer operations">{organizationTable()}</Card></>;
      if(page==="Modules") return <Card title="Enabled modules" subtitle="Configuration counts by organization"><DataTable label="Modules" columns={["Organization","Enabled modules"]} rows={organizations.map(o=>({id:o.id,cells:[o.name,o.modules]}))}/></Card>;
      return <Card title={page} subtitle="Current implementation"><EmptyState title="Additional controls are planned" detail="No subscription billing, provider monitoring or external support workflow is active."/></Card>;
    }
    if (page === "Overview") return controlOverview();
    if (page === "Organizations")
      return (
        <Card title="Organization directory" subtitle="Local demo context only">
          {organizationTable()}
        </Card>
      );
    if (page === "Users")
      return (
        <Card
          title="Demo team"
          subtitle="Role concepts only · no production permissions"
        >
          <DataTable
            label="Demo users"
            columns={["User", "Organization", "Role", "Status"]}
            rows={[
              {
                id: "u1",
                cells: [
                  "Demo operator",
                  "Forma Advisory",
                  "Workspace administrator",
                  <StatusBadge key="a" status="Active" />,
                ],
              },
              {
                id: "u2",
                cells: [
                  "Demo finance",
                  "Forma Advisory",
                  "Finance",
                  <StatusBadge key="a" status="Active" />,
                ],
              },
              {
                id: "u3",
                cells: [
                  "Demo coordinator",
                  "Forma Advisory",
                  "Operations",
                  <StatusBadge key="a" status="Active" />,
                ],
              },
              {
                id: "u4",
                cells: [
                  "Sandbox operator",
                  "Empty sandbox",
                  "Workspace administrator",
                  <StatusBadge key="a" status="Trial" />,
                ],
              },
            ]}
          />
        </Card>
      );
    if (page === "Modules")
      return (
        <div className="pq-feature-grid">
          {[
            "CRM",
            "Calendar",
            "Tasks",
            "Finance",
            "Analytics",
            "Automation",
          ].map((m) => (
            <Card title={m} key={m}>
              <div className="pq-feature-body">
                <p><ProductText text={"A modular workspace experience."} /></p>
                <StatusBadge
                  status={m === "Automation" ? "Preview" : "Enabled"}
                />
                <small>
                  <ProductText text={"Entitlement enforcement is a future server-side capability."} /></small>
              </div>
            </Card>
          ))}
        </div>
      );
    if (page === "Usage")
      return (
        <>
          <div className="pq-metrics pq-metrics-three">
            <MetricCard
              label="Demo records"
              value={Object.values(stores).reduce(
                (n, s) =>
                  n +
                  s.customers.length +
                  s.tasks.length +
                  s.appointments.length,
                0,
              )}
              detail="Customers, tasks and appointments"
            />
            <MetricCard
              label="Workspaces"
              value={2}
              detail="Synthetic contexts"
            />
            <MetricCard
              label="Billing subscriptions"
              value="Not active"
              detail="No metering or billing service"
            />
          </div>
          <Card
            title="Usage overview"
            subtitle="Local demo counts, not provider consumption"
          >
            <EmptyState
              title="Usage reporting is planned"
              detail="Production metering and entitlement limits will be defined after the durable data model."
            />
          </Card>
        </>
      );
    if (page === "Audit")
      return (
        <Card
          title="Administrative activity"
          subtitle="Synthetic demonstration · not an audit trail"
        >
          <ActivityFeed administrative store={store} />
        </Card>
      );
    if (page === "System")
      return (
        <Card title="Product status" subtitle="Local preview scope only">
          <div className="pq-status-summary">
            {["Client Workspace", "Control Center", "Demo data"].map((s) => (
              <div key={s}>
                <strong>{t(s)}</strong>
                <StatusBadge status="Preview" />
              </div>
            ))}
            <div>
              <strong><ProductText text={"Production monitoring"} /></strong>
              <StatusBadge status="Coming later" />
            </div>
          </div>
        </Card>
      );
    return (
      <Card
        title="Support hub"
        subtitle="Help your team find the right next step"
      >
        <div className="pq-feature-body">
          <h3><ProductText text={"Explore the product walkthrough"} /></h3>
          <p>
            <ProductText text={"Open a workspace, create a customer, schedule an appointment and record a demo payment."} /></p>
          <button
            className="pq-button"
            onClick={() => navigate("Overview", false)}
          >
            <ProductText text={"Open workspace"} /></button>
          <p className="pq-muted">
            <ProductText text={"Support ticket delivery and response commitments are not active in this preview."} /></p>
        </div>
      </Card>
    );
  }
  const clientPages: Record<string, () => ReactNode> = {
    Overview: overview,
    Customers: customers,
    Leads: leads,
    Calendar: calendar,
    Tasks: tasks,
    Invoices: invoices,
    Payments: payments,
    Analytics: analytics,
    Automation: automation,
    Settings: settings,
  };
  const selectedCustomer = store.customers.find((c) => c.id === detail);
  return (
    <AppShell
      authenticatedDemo={authenticatedDemo}
      persistent={persistence !== "demo"}
      remote={persistence === "remote"}
      workspaceOrganizations={organizations}
      currentUser={remoteUser?.name}
      canControl={persistence==="demo" || platformOwner}
      control={control}
      page={page}
      org={org}
      switchOrg={switchOrg}
      navigate={navigate}
      globalSearch={(q) => {
        navigate("Customers", false);
        setSearch(q);
      }}
    >
      {persistence === "postgres" && <div className="pq-notice" role="note"><ProductText text={"LOCAL PostgreSQL · Synthetic fixtures · UTC / USD · fixed operator identity. Analytics history and governance remain demo concepts."} /></div>}
      <PageHeader
        title={control && page === "Overview" ? "Control Center" : page}
        subtitle={
          control && page === "Overview"
            ? "A dedicated view for platform governance."
            : descriptions[page] || "Your work, clearly organized."
        }
        action={
          !control && !readOnly &&
          (entityForPage[page] ? (
            btn(
              actionLabels[entityForPage[page]],
              () => edit(entityForPage[page]),
              true,
            )
          ) : page === "Overview" ? (
            <>
              {btn("New customer", () => edit("customers"), true)}
              {btn("New appointment", () => edit("appointments"))}
            </>
          ) : null)
        }
      />
      {notice && (
        <div className="pq-notice" role="status">
          <Icon name="Check" />
          <span>{t(notice)}</span>
          <button
            className="pq-icon-button"
            aria-label={t("Dismiss message")}
            onClick={() => setNotice("")}
          >
            <Icon name="Close" size={16} />
          </button>
        </div>
      )}
      {control ? controlPage() : (clientPages[page] || overview)()}
      {editor && (
        <RecordEditor
          editor={editor}
          store={store}
          currentDate={currentDate}
          persistence={persistence}
          close={() => setEditor(null)}
          save={save}
        />
      )}
      {selectedCustomer && (
        <Modal title={selectedCustomer.name} translateTitle={false} drawer close={() => setDetail("")}>
          <div className="pq-dialog-body">
            <div className="pq-detail-identity">
              <Avatar name={selectedCustomer.name} />
              <div>
                <h3>{selectedCustomer.company}</h3>
                <p>{selectedCustomer.email}</p>
                <p>{selectedCustomer.phone || "No phone provided"}</p>
              </div>
              <StatusBadge status={selectedCustomer.status} />
            </div>
            <Tabs
              values={[
                "Summary",
                "Notes",
                "Appointments",
                "Tasks",
                "Billing",
                "Activity",
              ]}
              active={detailTab}
              onChange={setDetailTab}
            />
            {detailTab === "Summary" && (
              <>
                <div className="pq-metrics pq-metrics-two">
                  <MetricCard
                    label="Appointments"
                    value={
                      store.appointments.filter((a) => a.customerId === detail)
                        .length
                    }
                    detail="Demo records"
                  />
                  <MetricCard
                    label="Open tasks"
                    value={
                      store.tasks.filter(
                        (t) => t.customerId === detail && t.status === "Open",
                      ).length
                    }
                    detail="Next steps"
                  />
                </div>
                <p className="pq-detail-note">{selectedCustomer.notes}</p>
                <button
                  className="pq-button pq-primary"
                  onClick={() => {
                    edit("customers", detail);
                    setDetail("");
                  }}
                >
                  <ProductText text={"Edit customer"} /></button>
              </>
            )}
            {detailTab === "Notes" && (
              <p className="pq-detail-note">
                {selectedCustomer.notes || "No notes yet."}
              </p>
            )}
            {detailTab === "Appointments" && (
              <div className="pq-detail-list">
                {!store.appointments.some((a) => a.customerId === detail) && (
                  <EmptyState
                    title="No appointments yet"
                    detail="Schedule a first conversation from Calendar."
                  />
                )}
                {store.appointments
                  .filter((a) => a.customerId === detail)
                  .map((a) => (
                    <div key={a.id}>
                      <strong>{a.title}</strong>
                      <small>
                        {dateLabel(a.date)} · {a.time}
                      </small>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
              </div>
            )}
            {detailTab === "Tasks" && (
              <div className="pq-detail-list">
                {!store.tasks.some((t) => t.customerId === detail) && (
                  <EmptyState
                    title="No tasks yet"
                    detail="Create the next step from Tasks."
                  />
                )}
                {store.tasks
                  .filter((t) => t.customerId === detail)
                  .map((t) => (
                    <div key={t.id}>
                      <strong>{t.title}</strong>
                      <small><ProductText text={"Due"} />{dateLabel(t.due)}</small>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
              </div>
            )}
            {detailTab === "Billing" && (
              <div className="pq-detail-list">
                {!store.invoices.some((i) => i.customerId === detail) && (
                  <EmptyState
                    title="No invoices yet"
                    detail="Create a draft invoice from Finance."
                  />
                )}
                {store.invoices
                  .filter((i) => i.customerId === detail)
                  .map((i) => (
                    <div key={i.id}>
                      <strong>
                        {i.invoiceNumber || i.id} · {money(i.amount)}
                      </strong>
                      <small>
                        <ProductText text={"Balance"} />{money(i.amount - paidAmount(store, i.id))}
                      </small>
                      <StatusBadge status={i.status} />
                    </div>
                  ))}
              </div>
            )}
            {detailTab === "Activity" && (
              <ActivityFeed
                store={{
                  ...store,
                  activities: store.activities.filter(
                    (a) => a.customerId === detail,
                  ),
                }}
              />
            )}
          </div>
        </Modal>
      )}
      {detail === "reset" && (
        <Modal title="Reset demo workspace?" close={() => setDetail("")}>
          <div className="pq-dialog-body">
            <p>
              <ProductText text={"This discards only synthetic changes in"} />{" "}
              {organizations.find((o) => o.id === org)?.name}<ProductText text={". Production data is not connected."} /></p>
            <div className="pq-actions">
              <button className="pq-button" onClick={() => setDetail("")}>
                <ProductText text={"Cancel"} /></button>
              <button
                className="pq-button pq-primary"
                onClick={() => {
                  if (persistence !== "demo") {
                    setNotice("Reset is disabled here. Use the explicit local database reset script.");
                    setDetail("");
                    return;
                  }
                  setStores({
                    ...stores,
                    [org]: org === "studio" ? seedDemo() : emptyStore(),
                  });
                  setDetail("");
                  setNotice("Demo workspace reset.");
                }}
              >
                <ProductText text={"Reset demo"} /></button>
            </div>
          </div>
        </Modal>
      )}
      {orgDetail && (
        <Modal
          title={
            organizations.find((o) => o.id === orgDetail)?.name ||
            "Organization"
          }
          drawer
          close={() => setOrgDetail("")}
        >
          <div className="pq-dialog-body">
            <Tabs
              values={[
                "Overview",
                "Users",
                "Modules",
                "Configuration",
                "Activity",
              ]}
              active={orgTab}
              onChange={setOrgTab}
            />
            {persistence==='remote' ? <>
              <p>{t('Verified platform scope')} · {organizations.find(o=>o.id===orgDetail)?.industry}</p>
              <p>{t('Active memberships')}: {organizations.find(o=>o.id===orgDetail)?.users} · {t('Enabled modules')}: {organizations.find(o=>o.id===orgDetail)?.modules}</p>
              {orgTab==='Activity'&&orgDetail===org?<ActivityFeed administrative store={store}/>:<p>{t('Full member administration is not yet available')}</p>}
              <button className="pq-button" onClick={()=>{switchOrg(orgDetail);setOrgDetail('');navigate('Overview',false);}}>{t('Open workspace')}</button>
            </> : orgTab === "Overview" ? (
              <>
                <p>
                  <ProductText text={"Demo organization ·"} />{" "}
                  {organizations.find((o) => o.id === orgDetail)?.industry}
                </p>
                <p>
                  <ProductText text={"This simulated workspace does not grant production access."} /></p>
                <button
                  className="pq-button pq-primary"
                  onClick={() => {
                    switchOrg(orgDetail);
                    navigate("Overview", false);
                  }}
                >
                  <ProductText text={"Open workspace"} /></button>
              </>
            ) : orgTab === "Users" ? (
              <p>
                <ProductText text={"Synthetic team: demo operator"} />{orgDetail === "studio" && ", demo finance, demo coordinator"}<ProductText text={". Membership management comes later."} /></p>
            ) : orgTab === "Modules" ? (
              <div className="pq-status-summary">
                {[
                  "CRM",
                  "Calendar",
                  "Tasks",
                  "Finance",
                  "Analytics",
                  "Automation",
                ].map((m) => (
                  <div key={m}>
                    {m}
                    <StatusBadge status="Preview" />
                  </div>
                ))}
              </div>
            ) : orgTab === "Configuration" ? (
              <p>
                <ProductText text={"Display name and brand accent are prepared as design concepts. No provider configuration or secrets are exposed."} /></p>
            ) : (
              <ActivityFeed administrative store={stores[orgDetail]} />
            )}
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

function RecordEditor({
  editor,
  store,
  close,
  save,
  currentDate,
  persistence,
}: {
  editor: Editor;
  store: DemoStore;
  close: () => void;
  save: (entity: Entity, raw: unknown) => Promise<boolean>;
  currentDate:string;
  persistence:"demo"|"postgres"|"remote";
}) {
  const {t}=useProductLocale();

  const { entity, id } = editor;
  const record =
    entity === "payments" ? undefined : store[entity].find((r) => r.id === id);
  const initial = record as Record<string, unknown> | undefined;
  const [error, setError] = useState("");
  const [saving,setSaving]=useState(false);
  const field = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className={name === "notes" ? "pq-wide" : ""}>
      {t(label)}
      {name === "notes" ? (
        <textarea
          name={name}
          defaultValue={String(initial?.[name] || "")}
          maxLength={1500}
          rows={3}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={String(
            initial?.[name] ||
              (type === "date" ? currentDate : name === "time" ? "09:00" : ""),
          )}
          maxLength={type === "email" ? 150 : 120}
          min={type === "number" ? "0.01" : undefined}
          step={type === "number" ? "0.01" : undefined}
        />
      )}
    </label>
  );
  const select = (
    name: string,
    label: string,
    options: string[],
    fallback?: string,
  ) => (
    <label>
      {t(label)}
      <select
        name={name}
        aria-label={t(label)}
        defaultValue={String(initial?.[name] || fallback || options[0])}
      >
        {options.map((o) => (
          <option value={o} key={o}>{t(o)}</option>
        ))}
      </select>
    </label>
  );
  const customer = (required = true) => (
    <label>
      {t(required ? "Customer" : "Customer (optional)")}
      <select
        name="customerId"
        aria-label={t(required ? "Customer" : "Customer (optional)")}
        required={required}
        defaultValue={String(initial?.customerId || "")}
      >
        <option value=""><ProductText text={"Select customer"} /></option>
        {store.customers.map((c) => (
          <option value={c.id} key={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(saving) return;
    setError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const newId =
      id ||
      `${entity === "invoices" ? "INV-DEMO" : entity.slice(0, 1)}-${crypto.randomUUID().slice(0, 8)}`;
    let raw: unknown;
    if (entity === "customers") raw = { ...fields, id: newId };
    else if (entity === "leads") raw = { ...fields, id: newId };
    else if (entity === "tasks") raw = { ...fields, id: newId };
    else if (entity === "appointments")
      raw = { ...fields, id: newId, duration: Number(fields.duration) };
    else if (entity === "invoices")
      raw = {
        ...fields,
        id: newId,
        amount: Math.round(Number(fields.amount) * 100),
        status: "Draft",
      };
    else
      raw = {
        ...fields,
        id: `PAY-${crypto.randomUUID().slice(0, 8)}`,
        amount: Math.round(Number(fields.amount) * 100),
      };
    try {
      setSaving(true);
      if(!await save(entity, raw)) setError("The record was not saved. Please review the message and try again.");
    } catch (err) {
      setError(
        err instanceof Error && err.name !== "ZodError"
          ? err.message
          : "Please check the required fields and use a valid email, date and amount.",
      );
    } finally{setSaving(false);}
  }
  return (
    <Modal
      title={
        id && entity !== "payments"
          ? `Edit ${entity === "appointments" ? "appointment" : entity.slice(0, -1)}`
          : actionLabels[entity]
      }
      close={close}
    >
      <form className="pq-record-form" onSubmit={submit}>
        <p className="pq-form-intro">
          <ProductText text={persistence==='demo'?"Synthetic demo record. No external service will be contacted.":"Changes are saved to the connected workspace. Use fictional records for this integration test."} /></p>
        {error && (
          <p className="pq-form-error" role="alert">
            {t(error)}
          </p>
        )}
        {entity === "customers" && (
          <>
            <FormSection title="Customer details">
              {field("name", "Customer name")}
              {field("company", "Business type", "text", false)}
              {field("email", "Contact email", "email")}
              {field("phone", "Phone", "tel", false)}
            </FormSection>
            <FormSection title="Relationship">
              {select("status", "Status", ["Active", "Inactive"])}
              {field("notes", "Notes", "text", false)}
            </FormSection>
          </>
        )}
        {entity === "leads" && (
          <>
            <FormSection title="Opportunity">
              {field("name", "Lead name")}
              {field("company", "Business type", "text", false)}
              {select("status", "Stage", [
                "New",
                "Contacted",
                "Qualified",
                "Won",
                "Lost",
              ])}
            </FormSection>
            <FormSection title="Next step">
              {field("nextAction", "Next action", "text", false)}
              {select("owner", "Owner", ["Demo operator", "Demo coordinator"])}
            </FormSection>
          </>
        )}
        {entity === "appointments" && (
          <>
            <FormSection title="Appointment">
              {field("title", "Appointment title")}
              {customer()}
            </FormSection>
            <FormSection title="Schedule">
              {field("date", "Date", "date")}
              {field("time", "Time", "time")}
              {select(
                "duration",
                "Duration (minutes)",
                ["15", "30", "45", "60", "90", "120"],
                "30",
              )}
              {select("status", "Status", [
                "Scheduled",
                "Completed",
                "Cancelled",
              ])}
            </FormSection>
          </>
        )}
        {entity === "tasks" && (
          <>
            <FormSection title="Next step">
              {field("title", "Task title")}
              {customer(false)}
            </FormSection>
            <FormSection title="Planning">
              {field("due", "Due date", "date")}
              {select(
                "priority",
                "Priority",
                ["Low", "Medium", "High"],
                "Medium",
              )}
              {select("status", "Status", ["Open", "Completed"])}
              {select("assignee", "Assignee", [
                "Demo operator",
                "Demo finance",
                "Demo coordinator",
              ])}
            </FormSection>
          </>
        )}
        {entity === "invoices" && (
          <FormSection title="Draft invoice">
            {customer()}
            {field("amount", "Amount (USD)", "number")}
            {field("due", "Due date", "date")}
          </FormSection>
        )}
        {entity === "payments" && (
          <FormSection title="Record incoming payment">
            <label>
              <ProductText text={"Invoice"} /><select
                aria-label={t("Invoice")}
                name="invoiceId"
                required
                defaultValue={id || ""}
              >
                <option value=""><ProductText text={"Choose an invoice"} /></option>
                {store.invoices
                  .filter((i) => !["Draft", "Paid"].includes(i.status))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoiceNumber || i.id} · {customerName(store, i.customerId)} ·{" "}
                      {money(i.amount - paidAmount(store, i.id))} <ProductText text={"due"} /></option>
                  ))}
              </select>
            </label>
            {field("amount", "Payment amount (USD)", "number")}
            {field("date", "Payment date", "date")}
            {select("method", "Method", ["Bank transfer", "Card", "Cash"])}
          </FormSection>
        )}
        <div className="pq-form-footer">
          <button className="pq-button" type="button" onClick={close}>
            <ProductText text={"Cancel"} /></button>
          <button className="pq-button pq-primary" type="submit" disabled={saving}>
            {t(entity === "payments"
              ? "Save payment"
              : id
                ? "Save changes"
                : "Create record")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
