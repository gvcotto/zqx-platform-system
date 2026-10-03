# Migration tracks

CURRENT V2 operational source: 202610020001_v2_core.sql, 202610020002_v2_security.sql, 202610020003_v2_invariants.sql, 202610020004_invoice_numbers.sql in filename order. Plain PostgreSQL, dedicated zqx schema; provision the restricted application role separately. All four reviewed migrations applied remotely under explicit human authorization; see ../../../../docs/phase2/PHASE2C_REMOTE_MIGRATION.md.

`.gitattributes` disables SQL text conversion so Windows `core.autocrlf` cannot change ledger checksums. Preserve exact reviewed migration bytes; never edit an applied migration. Verify working-tree and staged-blob SHA-256 parity before release. Add subsequent changes in a new reviewed migration.

../maintenance/20260928_remove_temporary_password.sql is historical Phase 1 maintenance archived unchanged. It assumes legacy public.users/temporary_password already exists and is NOT a clean-database bootstrap. ../schema.sql is historical reference, not V2 operational truth.

Use D:/ZQX/scripts/phase2b-database.ps1 for historical local baseline evidence or scripts/migrate.mjs for the current ledger-enabled track. Explicit -Recreate discards only the dedicated synthetic volume. The four-file ledger was validated locally and remotely; bootstrap and runtime credentials never belong in migrations. No automatic destructive rollback.
