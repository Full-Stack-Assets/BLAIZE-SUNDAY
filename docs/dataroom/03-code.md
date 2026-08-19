# 03 Code

- Repository: `Full-Stack-Assets/BLAIZE-SUNDAY`
- Package manager: pnpm 9.12.0, lockfile required
- CI must fail on typecheck/test/build
- Secret scan: run at tag time; `.env` is gitignored
- SBOM: generate with the then-current lockfile; do not commit fabricated SBOMs

Tag a diligence snapshot only after CI is green.
