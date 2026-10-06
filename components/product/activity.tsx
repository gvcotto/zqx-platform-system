import type { DemoStore } from "@/lib/demo/model";
import { customerName } from "@/lib/demo/model";
import { EmptyState, Icon } from "./ui";
import {useProductLocale} from './locale';
export function ActivityFeed({
  store,
  administrative = false,
}: {
  store: DemoStore;
  administrative?: boolean;
}) {
  const {t}=useProductLocale();
  const rows = administrative
    ? [
        {
          id: "admin1",
          title: "Workspace preview opened",
          detail: "Forma Advisory · synthetic event",
          time: "09:00",
          customerId: "",
        },
        {
          id: "admin2",
          title: "Module catalogue reviewed",
          detail: "Demo operator · synthetic event",
          time: "Yesterday",
          customerId: "",
        },
      ]
    : store.activities.slice(0, 6);
  return (
    <ol className="pq-activity-feed">
      {rows.map((a, i) => (
        <li key={a.id}>
          <span className="pq-activity-icon">
            <Icon name={i === 0 ? "Payments" : "Tasks"} size={15} />
          </span>
          <div>
            <strong>{t(a.title)}</strong>
            <p>
              {a.customerId ? `${customerName(store, a.customerId)} · ` : ""}
              {t(a.detail)}
            </p>
            <small>{a.time}</small>
          </div>
        </li>
      ))}
      {!rows.length && (
        <li>
          <EmptyState
            title="No recent activity"
            detail="Your next demo action will appear here."
          />
        </li>
      )}
    </ol>
  );
}
