import {describe,it,expect} from "vitest";
import {bootstrapAllowed,identityFromVerifiedUser,remotePersistenceAllowed} from "@/lib/infrastructure/adapters/remote-identity-policy";
const identity=identityFromVerifiedUser({id:"20000000-0000-0000-0000-000000000001",email:"gvcotto@zqxconsulting.com",email_confirmed_at:"2026-10-02T00:00:00Z"});
const env={NODE_ENV:"development",ZQX_RUNTIME_MODE:"development-remote",ZQX_OWNER_BOOTSTRAP_ENABLED:"true",ZQX_SYSTEM_OWNER_EMAIL:"gvcotto@zqxconsulting.com"} as NodeJS.ProcessEnv;
describe("verified identity/bootstrap boundary",()=>{
 it("rejects no verified user",()=>expect(()=>identityFromVerifiedUser(null)).toThrow());
 it("rejects invalid IdP UUID",()=>expect(()=>identityFromVerifiedUser({id:"browser-id"})).toThrow());
 it("links by verified UUID, not email",()=>expect(identity.actor.authSubject).toBe("20000000-0000-0000-0000-000000000001"));
 it("permits explicit first corporate bootstrap locally",()=>expect(bootstrapAllowed(identity,false,env)).toBe(true));
 it("rejects wrong email",()=>expect(bootstrapAllowed({...identity,email:"wrong@example.invalid"},false,env)).toBe(false));
 it("rejects unconfirmed email",()=>expect(bootstrapAllowed({...identity,confirmed:false},false,env)).toBe(false));
 it("rejects existing owner/replay",()=>expect(bootstrapAllowed(identity,true,env)).toBe(false));
 it("rejects disabled bootstrap",()=>expect(bootstrapAllowed(identity,false,{...env,ZQX_OWNER_BOOTSTRAP_ENABLED:"false"})).toBe(false));
 it("bootstrap never uses admin credentials in production",()=>expect(bootstrapAllowed(identity,false,{...env,NODE_ENV:"production",ZQX_RUNTIME_MODE:"production"})).toBe(false));
 it("remote mode cannot silently enable itself",()=>expect(remotePersistenceAllowed({NODE_ENV:"development"})).toBe(false));
 it("explicit remote development is accepted",()=>expect(remotePersistenceAllowed(env)).toBe(true));
 it("demo never uses real remote persistence",()=>expect(remotePersistenceAllowed({...env,ZQX_RUNTIME_MODE:"demo"})).toBe(false));
});
