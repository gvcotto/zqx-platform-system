import { describe,it,expect,vi } from "vitest";
import { WorkspaceService, commandSchema } from "@/lib/application/workspace";
import { localActor, localPersistenceAllowed } from "@/lib/infrastructure/adapters/local-identity";
import { emptyStore } from "@/lib/demo/model";
const org="30000000-0000-0000-0000-000000000001";
const actor={authSubject:"20000000-0000-0000-0000-000000000002",requestId:"test"};
const env={NODE_ENV:"development",ZQX_RUNTIME_MODE:"development",ZQX_LOCAL_DATA_V2:"true",ZQX_DATABASE_URL:"postgres://zqx_app@database:5432/zqx_local",ZQX_LOCAL_AUTH_SUBJECT:actor.authSubject} as NodeJS.ProcessEnv;
describe("V2 application boundary",()=>{
 it("requires explicit local profile",()=>expect(localPersistenceAllowed({...env,ZQX_LOCAL_DATA_V2:undefined})).toBe(false));
 it("cannot enable fixture identity in production",()=>expect(()=>localActor({...env,NODE_ENV:"production"})).toThrow());
 it("cannot connect fixture identity to a remote DB",()=>expect(()=>localActor({...env,ZQX_DATABASE_URL:"postgres://zqx_app@remote.example.invalid/zqx_local"})).toThrow());
 it("uses stable subject, not email",()=>expect(localActor(env).authSubject).toBe(actor.authSubject));
 it("supports the explicit development-local profile",()=>expect(localActor({...env,ZQX_RUNTIME_MODE:"development-local"}).authSubject).toBe(actor.authSubject));
 it("never enables fixture authentication for development-remote",()=>expect(()=>localActor({...env,ZQX_RUNTIME_MODE:"development-remote"})).toThrow());
 it("rejects body identity/roles",()=>expect(commandSchema.safeParse({organizationId:org,entity:"customers",record:{},authSubject:actor.authSubject}).success).toBe(false));
 it("returns a presentation model through repository",async()=>{
  const repository={snapshot:vi.fn().mockResolvedValue(emptyStore()),save:vi.fn()};
  expect(await new WorkspaceService(repository).snapshot(actor,org)).toEqual(emptyStore());
  expect(repository.snapshot).toHaveBeenCalledWith(actor,org);
 });
 it("database failure never falls back to synthetic data",async()=>{
  const repository={snapshot:vi.fn().mockRejectedValue(new Error("Database unavailable")),save:vi.fn()};
  await expect(new WorkspaceService(repository).snapshot(actor,org)).rejects.toThrow("Database unavailable");
 });
 it("invalid inputs do not reach repository",async()=>{
  const repository={snapshot:vi.fn(),save:vi.fn()};
  await expect(new WorkspaceService(repository).save(actor,{organizationId:org,entity:"customers",record:{name:"x"}})).rejects.toThrow();
  expect(repository.save).not.toHaveBeenCalled();
 });
});
