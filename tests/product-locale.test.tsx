import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductLocaleProvider,translateProduct} from '@/components/product/locale';
import {Tabs,StatusBadge,PageHeader} from '@/components/product/ui';
import {calendarRange,revenueSeries} from '@/lib/application/workspace-calendar';
import {emptyStore} from '@/lib/demo/model';
describe('EN/ES product presentation',()=>{
 it('translates labels without changing English keys',()=>{expect(translateProduct('Customers','es')).toBe('Clientes');expect(translateProduct('Customers','en')).toBe('Customers');});
 it('never translates fictional/customer free text',()=>expect(translateProduct('Fictional business name','es')).toBe('Fictional business name'));
 it('renders Spanish heading, tabs and state preserving action keys',()=>{
 const html=renderToStaticMarkup(<ProductLocaleProvider initialLocale="es"><PageHeader title="Tasks" subtitle="The next step, without the noise."/><Tabs values={['Open','Completed']} active="Open" onChange={()=>{}}/><StatusBadge status="Partial"/></ProductLocaleProvider>);
 expect(html).toContain('Tareas');expect(html).toContain('Pendiente');expect(html).toContain('Parcial');expect(html).toContain('pq-badge-partial');expect(html).toContain('aria-pressed="true"');
 });
 it('calculates calendar across year boundary',()=>expect(calendarRange('2027-01-01')).toEqual({start:'2026-12-28',end:'2027-01-03',blanks:4,days:31}));
 it('uses only recorded payments for remote trends',()=>{const store=emptyStore();store.payments.push({id:'synthetic',invoiceId:'synthetic',amount:4000,date:'2026-10-02',method:'Cash'});const series=revenueSeries(store,'2026-10-03');expect(series).toHaveLength(6);expect(series[5]).toEqual({label:'2026-10',value:4000});expect(series.slice(0,5).every(point=>point.value===0)).toBe(true);});
});
