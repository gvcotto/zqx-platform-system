import { randomUUID } from "node:crypto";
import { type PoolClient } from "pg";
import { workspacePool } from "./postgres-pool";
import { z } from "zod";
import { customerSchema, leadSchema, appointmentSchema, taskSchema, invoiceSchema, paymentSchema, storeSchema, type Entity } from "@/lib/demo/model";
import type { Actor } from "@/lib/domain/v2";
import type { WorkspaceRepository } from "@/lib/application/workspace";

const presentation = {
  customers: "id,name,email,company,phone,initcap(status) status,notes",
  leads: "id,name,company,initcap(stage) status,next_action as \"nextAction\",'' as owner",
  appointments: "id,title,coalesce(customer_id::text,'') as \"customerId\",to_char(starts_at at time zone 'UTC','YYYY-MM-DD') date,to_char(starts_at at time zone 'UTC','HH24:MI') time,initcap(status) status,(extract(epoch from ends_at-starts_at)/60)::integer duration",
  tasks: "id,title,coalesce(customer_id::text,'') as \"customerId\",to_char(due_at at time zone 'UTC','YYYY-MM-DD') due,initcap(priority) priority,initcap(status) status,'' as assignee",
  invoices: "id,invoice_number as \"invoiceNumber\",customer_id as \"customerId\",total::integer amount,to_char(due_at at time zone 'UTC','YYYY-MM-DD') due,initcap(status) status",
  payments: "id,invoice_id as \"invoiceId\",amount::integer amount,to_char(paid_at at time zone 'UTC','YYYY-MM-DD') date,case method when 'bank_transfer' then 'Bank transfer' when 'card' then 'Card' else 'Cash' end method",
} as const;
export class PostgresWorkspace implements WorkspaceRepository {
  private async transaction<T>(actor: Actor, org: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await workspacePool().connect();
    try {
      await client.query("begin");
      await client.query("select set_config('zqx.auth_subject',$1,true),set_config('zqx.request_id',$2,true)", [actor.authSubject, actor.requestId]);
      const permission = await client.query<{ allowed: boolean }>("select zqx.allowed($1) allowed", [org]);
      if (!permission.rows[0]?.allowed) throw new Error("Organization access denied.");
      const result = await operation(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error; // No fallback to demo, RAM or success.
    } finally { client.release(); }
  }
  async snapshot(actor: Actor, organizationId: string) {
    return this.transaction(actor, organizationId, async client => {
      await client.query("select zqx.record_access($1)", [organizationId]);
      const result: Record<string, unknown> = { version: 1, activities: [] };
      for (const entity of Object.keys(presentation) as Entity[]) {
        // Identifiers originate only from the compile-time allowlist.
        result[entity] = (await client.query(`select ${presentation[entity]} from zqx.${entity} where organization_id=$1 ${entity === "invoices" ? "and status<>'void'" : ""} order by created_at desc,id limit 500`, [organizationId])).rows;
      }
      result.activities=(await client.query(`select id,initcap(action)||' '||resource_type title,resource_type detail,
        case when resource_type='customers' then coalesce(resource_id::text,'') else '' end as "customerId",
        to_char(occurred_at at time zone 'UTC','YYYY-MM-DD HH24:MI') time from zqx.audit_events
        where organization_id=$1 order by occurred_at desc,id limit 100`,[organizationId])).rows;
      return storeSchema.parse(result);
    });
  }
  async save(actor: Actor, organizationId: string, entity: Entity, raw: unknown) {
    return this.transaction(actor, organizationId, async client => {
      let id: string; let columns: string[]; let values: unknown[];
      switch (entity) {
        case "customers": {
          const r=customerSchema.parse(raw); id=r.id;
          columns=["name","email","company","phone","status","notes"]; values=[r.name,r.email,r.company,r.phone,r.status.toLowerCase(),r.notes]; break;
        }
        case "leads": {
          const r=leadSchema.parse(raw); id=r.id; columns=["name","company","stage","next_action"];
          values=[r.name,r.company,r.status.toLowerCase(),r.nextAction]; break;
        }
        case "tasks": {
          const r=taskSchema.parse(raw); id=r.id; columns=["title","customer_id","due_at","priority","status"];
          values=[r.title,r.customerId || null,r.due+"T00:00:00Z",r.priority.toLowerCase(),r.status.toLowerCase()]; break;
        }
        case "appointments": {
          const r=appointmentSchema.parse(raw); id=r.id; columns=["title","customer_id","starts_at","ends_at","status"];
          const start=r.date+"T"+r.time+":00Z";
          values=[r.title,r.customerId || null,start,new Date(Date.parse(start)+r.duration*60000).toISOString(),r.status.toLowerCase()]; break;
        }
        case "invoices": {
          const r=invoiceSchema.parse(raw); id=r.id; columns=["customer_id","subtotal","total","status","due_at","issued_at"];
          values=[r.customerId,r.amount,r.amount,r.status.toLowerCase(),r.due+"T00:00:00Z",r.status==="Draft"?null:new Date().toISOString()]; break;
        }
        case "payments": {
          const r=paymentSchema.parse(raw); id=r.id;
          const invoice=await client.query<{customer_id:string;currency:string}>("select customer_id,currency from zqx.invoices where organization_id=$1 and id=$2",[organizationId,z.guid().parse(r.invoiceId)]);
          if(!invoice.rows[0]) throw new Error("Invoice unavailable.");
          columns=["invoice_id","customer_id","amount","currency","method","paid_at"];
          values=[r.invoiceId,invoice.rows[0].customer_id,r.amount,invoice.rows[0].currency,r.method==="Bank transfer"?"bank_transfer":r.method.toLowerCase(),r.date+"T00:00:00Z"]; break;
        }
      }
      const existingId=z.guid().safeParse(id);
      id=existingId.success?existingId.data:randomUUID();
      if (existingId.success && entity !== "payments") {
        const updated=await client.query(`update zqx.${entity} set ${columns.map((c,i)=>c+"=$"+(i+3)).join(",")} where organization_id=$1 and id=$2 returning id`,[organizationId,id,...values]);
        if(updated.rowCount!==1) throw new Error("Record is missing or not writable.");
      } else {
        await client.query(`insert into zqx.${entity}(organization_id,id,${columns.join(",")}) values(${[organizationId,id,...values].map((_,i)=>"$"+(i+1)).join(",")})`,[organizationId,id,...values]);
      }
    });
  }
}
