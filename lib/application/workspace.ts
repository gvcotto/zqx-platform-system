import { z } from "zod";
import { customerSchema, leadSchema, appointmentSchema, taskSchema, invoiceSchema, paymentSchema, type DemoStore, type Entity } from "@/lib/demo/model";
import type { Actor } from "@/lib/domain/v2";

/** Stable presentation DTO retained from Phase 2A. Not a database row or provider SDK. */
export type WorkspaceView = DemoStore;
export interface WorkspaceOrganization {id:string;name:string;initials:string;industry:string;status:string;modules:number;users:number;role?:string;canWrite?:boolean}
export interface WorkspaceRepository {
  snapshot(actor: Actor, organizationId: string): Promise<WorkspaceView>;
  save(actor: Actor, organizationId: string, entity: Entity, record: unknown): Promise<void>;
}
export const commandSchema = z.object({
  organizationId: z.guid(),
  entity: z.enum(["customers","leads","appointments","tasks","invoices","payments"]),
  record: z.unknown(),
}).strict();
const schemas = { customers: customerSchema, leads: leadSchema, appointments: appointmentSchema, tasks: taskSchema, invoices: invoiceSchema, payments: paymentSchema };
export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}
  snapshot(actor: Actor, organizationId: string) {
    return this.repository.snapshot(actor, z.guid().parse(organizationId));
  }
  async save(actor: Actor, input: unknown) {
    const command = commandSchema.parse(input);
    const record = schemas[command.entity].parse(command.record);
    await this.repository.save(actor, command.organizationId, command.entity, record);
    return this.snapshot(actor, command.organizationId);
  }
}
