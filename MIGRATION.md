# RDN STREET STOCK MARKET migration

## Preserved baseline

- Legacy source revision: `3507d0989f899d8c4d82d396612e79a08c4278b5` (main).
- Imported baseline commit: `7124712` (dev); root import commit: `c0e8948`.
- Verified all 708 inventoried files against their SHA-256 hashes before editing: no missing files or mismatches.
- Immutable inventory: `.newly-legacy-import.json`, unchanged.
- Original pnpm lockfile SHA-256: `868c2bd3c3ddeb763e5b8b869c07d1e6ad8cbcc9284c82ace23bd6a12e2b1042`.
- Runtime declarations preserved: Expo `~54.0.1`, React Native `0.81.5`, React `19.1.0`. Original pnpm lock resolves Expo `54.0.37` and React Native `0.81.5`.
- Package manager: pnpm; lockfile format 9.0; `.npmrc` uses hoisted node linking. No conflicting lockfiles or handwritten native directories were inventoried. Assets, plugins, and native configuration are preserved.
- Read the attached historical chat for product context (Italian social group-buying marketplace, drops, suppliers, pickup points). Historical claims are not fresh validation; the attachment is not imported Git history.

## Package-manager pin

The original pnpm version was unrecorded. Selected and pinned `pnpm@9.15.9` as a compatible migration tool, not as a recovered original version. It supports the original version-9 lock format and Node 22 (migration environment: Node `22.23.3`). Compatibility reference: https://pnpm.io/installation . Installation will first use the frozen original lockfile through Corepack.

## Listed migration issues

- `package_manager_version_unrecorded`: addressed by the explicit pin above in a separate migration commit.
- `fingerprint_missing`: pending exact compatible preview prerequisite addition.
- `expo-dev-client` is also absent from the source manifest; its compatible exact version will be taken from the installed locked Expo release metadata, with no Expo or React Native upgrade.

## Service bindings

The import inventory has an empty `services` list. No inventoried service exists to retarget or data-export through this migration. Existing external integrations are preserved, not recreated or claimed migrated. No legacy mutation or credential copying is authorized. The original service remains the source of truth for original app data.

## Security and scope

The inventory flags two legacy Stripe documentation files as containing live keys. Their values have not been opened or copied; they are not needed for preview. Existing keys should be reviewed/rotated by their owner before sharing this imported source. No new secrets are committed by this migration.

Git history, backend data, environment values, signing/publishing links, and billing were not transferred. Rollback is reverting migration commits or reopening the untouched original project.

## Preview prerequisites

- Frozen original install passed using `corepack pnpm@9.15.9 install --frozen-lockfile`.
- Installed locked Expo `54.0.37` metadata recommends `expo-dev-client ~6.0.21` and `@expo/fingerprint ~0.15.5`. Added exact versions `6.0.21` and `0.15.5`, plus the dev-client config plugin per https://docs.expo.dev/versions/v54.0.0/sdk/dev-client/ .
- Reviewed manifest/lock diff: 55 additive lockfile lines, no existing locked dependency versions changed. Expo and React Native remain `54.0.37` / `0.81.5`.
- Expo dependency compatibility check passed (the original safe-area-context exclusion remains unchanged). A second frozen install passed.
- Added a `typecheck` script without changing compiler options or suppressing diagnostics.

## Validation

`bun run typecheck` fails with **1,052 pre-existing errors in 89 files**, identical to the pre-prerequisite baseline diagnostics. Most are Supabase schema typing (`never`); others include existing missing web-only Leaflet dependencies, Deno edge-function typing, asset declarations, and missing symbols in legacy screens. These are not introduced by migration. Broad source repair is intentionally outside the minimum-preservation migration; native preview is attempted with this static-check limitation explicitly recorded, not presented as type-clean.

### Native submission results (2026-10-14)

- Source submitted from migration commit `3412058` (manager-pin commit `debd403`).
- Turn/request identity: `server_dce23405fbe045a6ad25146634f98841`.
- iOS: **failed before compilation**, build API HTTP **413 Request Entity Too Large**. Immutable source snapshot: **66,038 KiB**. No native build ID was issued.
- Android: **failed before compilation**, build API HTTP **413 Request Entity Too Large**, source snapshot **66,038 KiB**. No native build ID was issued.
- Both outcomes were awaited independently through the normal preview path. No manually built artifacts or fallback clients were used.
- iOS failure inspection returned HTTP **404**, `Build not found for this session`, consistent with no acknowledged build ID. Preview logs confirm HTTP 413 and no active simulator linked to the session.
- This is an upload/service-boundary failure, not evidence of a dependency, compiler, signing, or app-code defect. No blind retry, runtime upgrade, asset deletion, or baseline alteration was performed.
- Simulator launch and meaningful interaction: **blocked / not tested** because the upload was rejected. No launch confirmation is claimed, and no service/data migration phase was started.
- Android runtime: **not tested** (submission failed). Web: **not tested**.

### Next prerequisite

The normal native build service must accept the preserved source snapshot (or provide a supported upload path for its size) before native compilation and simulator verification can continue. The full imported baseline and original lockfile remain recoverable in the import commits. No data, account, service binding, billing, signing, or publishing migration is claimed.
