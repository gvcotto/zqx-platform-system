-- Phase 2C additive numbering, authorized 2026-10-03 and locally validated.
-- Additive, provider-neutral, no change to UUID PKs or historical migration hashes.
BEGIN;
ALTER TABLE zqx.invoices ADD COLUMN invoice_sequence bigint;
ALTER TABLE zqx.invoices ADD COLUMN invoice_number text;
WITH numbered AS (
 SELECT id,organization_id,row_number() OVER(PARTITION BY organization_id ORDER BY created_at,id) seq
 FROM zqx.invoices
)
UPDATE zqx.invoices i SET invoice_sequence=n.seq,
 invoice_number='INV-'||extract(year from i.created_at at time zone 'UTC')::integer::text||'-'||lpad(n.seq::text,greatest(6,length(n.seq::text)),'0')
FROM numbered n WHERE i.organization_id=n.organization_id AND i.id=n.id;
ALTER TABLE zqx.invoices ALTER COLUMN invoice_sequence SET NOT NULL;
ALTER TABLE zqx.invoices ALTER COLUMN invoice_number SET NOT NULL;
ALTER TABLE zqx.invoices ADD CONSTRAINT invoice_sequence_positive CHECK(invoice_sequence>0);
ALTER TABLE zqx.invoices ADD CONSTRAINT invoice_sequence_org_unique UNIQUE(organization_id,invoice_sequence);
ALTER TABLE zqx.invoices ADD CONSTRAINT invoice_number_org_unique UNIQUE(organization_id,invoice_number);
CREATE FUNCTION zqx.assign_invoice_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,zqx AS $$
DECLARE seq bigint;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.invoice_sequence IS DISTINCT FROM OLD.invoice_sequence OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
   RAISE EXCEPTION 'Invoice identifier is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 -- Every insertion through this table uses the same transaction-scoped org lock.
 -- No counter table, no provider assumption, no yearly reset/accounting semantics.
 PERFORM pg_advisory_xact_lock(hashtextextended('zqx-invoice-number:'||NEW.organization_id::text,0));
 SELECT coalesce(max(invoice_sequence),0)+1 INTO seq FROM zqx.invoices WHERE organization_id=NEW.organization_id;
 NEW.invoice_sequence:=seq;
 NEW.invoice_number:='INV-'||extract(year from clock_timestamp() at time zone 'UTC')::integer::text||'-'||lpad(seq::text,greatest(6,length(seq::text)),'0');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION zqx.assign_invoice_number() FROM PUBLIC,zqx_app;
CREATE TRIGGER invoice_number_before BEFORE INSERT OR UPDATE ON zqx.invoices FOR EACH ROW EXECUTE FUNCTION zqx.assign_invoice_number();
COMMIT;
