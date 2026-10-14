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

## Validation

Pending dependency installation, typecheck, native builds, and simulator interaction. Android and Web have not yet been tested.
