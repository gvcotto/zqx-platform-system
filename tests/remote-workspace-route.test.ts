import {beforeEach,describe,it,expect,vi} from 'vitest';
import {emptyStore} from '@/lib/demo/model';
const mocks=vi.hoisted(()=>({context:vi.fn(),snapshot:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/infrastructure/adapters/remote-identity',()=>({remoteContext:mocks.context}));
vi.mock('@/lib/infrastructure/adapters/postgres-workspace',()=>({PostgresWorkspace:class{snapshot=mocks.snapshot;save=mocks.save;}}));
import {GET,POST} from '@/app/api/workspace/route';
const org='30000000-0000-0000-0000-000000000001';
const other='30000000-0000-0000-0000-000000000002';
const actor={authSubject:'20000000-0000-0000-0000-000000000001',requestId:'server-request'};
const customer={id:'new-synthetic',name:'Synthetic customer',email:'fixture@example.invalid',company:'Fictional',phone:'',status:'Active',notes:''};
const url='http://localhost:3007/api/workspace';
function write(body:unknown,origin:string|null='http://localhost:3007'){return new Request(url,{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)});}
describe('verified remote BFF trust boundary',()=>{
 beforeEach(()=>{vi.stubEnv('ZQX_RUNTIME_MODE','production');vi.clearAllMocks();mocks.context.mockResolvedValue({actor,user:{id:'internal',name:'Synthetic'},organizations:[{id:org}],platformOwner:false});mocks.snapshot.mockResolvedValue(emptyStore());mocks.save.mockResolvedValue(undefined);});
 it('is absent in demo mode',async()=>{vi.stubEnv('ZQX_RUNTIME_MODE','demo');expect((await GET(new Request(url))).status).toBe(404);expect(mocks.context).not.toHaveBeenCalled();});
 it('denies an unauthenticated actor',async()=>{mocks.context.mockRejectedValue(new Error('Unauthenticated'));expect((await GET(new Request(url+'?organizationId='+org))).status).toBe(403);expect(mocks.snapshot).not.toHaveBeenCalled();});
 it('denies authenticated identity without linkage',async()=>{mocks.context.mockRejectedValue(new Error('Identity not linked'));expect((await GET(new Request(url+'?organizationId='+org))).status).toBe(403);});
 it('denies linked identity without membership',async()=>{mocks.context.mockResolvedValue({actor,organizations:[]});expect((await GET(new Request(url+'?organizationId='+org))).status).toBe(403);});
 it('rejects forged organization selection',async()=>{expect((await GET(new Request(url+'?organizationId='+other))).status).toBe(403);expect(mocks.snapshot).not.toHaveBeenCalled();});
 it('rejects forged tenant writes before repository',async()=>{expect((await POST(write({organizationId:other,entity:'customers',record:customer}))).status).toBe(403);expect(mocks.save).not.toHaveBeenCalled();});
 it.each(['authSubject','role','email','userId'])('rejects request-body trust field %s',async field=>{expect((await POST(write({organizationId:org,entity:'customers',record:customer,[field]:'forged'}))).status).toBe(400);expect(mocks.save).not.toHaveBeenCalled();});
 it('uses only server verified actor and returns DTO without identity secrets',async()=>{const response=await POST(write({organizationId:org,entity:'customers',record:{...customer,auth_subject:'forged'}}));expect(response.status).toBe(200);expect(mocks.save).toHaveBeenCalledWith(actor,org,'customers',customer);const payload=await response.text();expect(payload).not.toContain(actor.authSubject);expect(payload).not.toContain('auth_subject');expect(payload).not.toContain('forged');expect(response.headers.get('cache-control')).toBe('no-store');});
 it('denies absent/foreign Origin',async()=>{for(const origin of [null,'https://untrusted.example.invalid'])expect((await POST(write({organizationId:org,entity:'customers',record:customer},origin))).status).toBe(403);expect(mocks.context).not.toHaveBeenCalled();});
 it('does not disclose internal database errors or fallback',async()=>{mocks.save.mockRejectedValue(new Error('credential-redaction-probe'));const response=await POST(write({organizationId:org,entity:'customers',record:customer}));expect(response.status).toBe(400);expect(await response.text()).not.toContain('credential-redaction-probe');expect(mocks.snapshot).not.toHaveBeenCalled();});
 it('denies oversized bodies before database access',async()=>{expect((await POST(write({organizationId:org,record:'x'.repeat(16001)}))).status).toBe(413);expect(mocks.save).not.toHaveBeenCalled();});
});
