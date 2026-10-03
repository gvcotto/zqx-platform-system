import {describe,it,expect} from "vitest";
import {migrationBody,loadMigrations} from "../scripts/migrate.mjs";
describe("portable migration track",()=>{
 it("strips only the reviewed outer transaction",()=>expect(migrationBody("-- safe\nbegin; select 1; commit;")).toContain("select 1"));
 it("rejects missing transaction",()=>expect(()=>migrationBody("select 1")).toThrow());
 it("rejects nested commit",()=>expect(()=>migrationBody("begin; commit; select 1; commit;")).toThrow());
 it("rejects nontransactional index operation",()=>expect(()=>migrationBody("begin; create index concurrently test on x(id); commit;")).toThrow());
 it("operational track excludes maintenance and has SHA256 checksums",async()=>{
  const migrations=await loadMigrations(new URL("../supabase/migrations",import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1"));
  expect(migrations).toHaveLength(4);
  expect(migrations.every(m=>m.checksum.length===64 && m.filename.startsWith("20261002"))).toBe(true);
 });
});
