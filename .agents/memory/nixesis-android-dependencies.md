---
name: Nixesis Android dependency setup
description: Replit package-firewall and install-script constraints encountered while adding Capacitor Android assets.
---

When refreshing the Nixesis Android dependencies, `@capacitor/assets` 3.0.5 brings older Capacitor CLI and image-processing dependencies. Replit blocks vulnerable package releases, and skipped install scripts can leave old native image packages unusable. The workspace uses scoped overrides to maintained `tar` and `sharp` releases; the Capacitor asset generator then runs successfully. A just-published Vitest major may also be held by the workspace minimum-release-age policy, so use the newest eligible compatible release rather than bypassing the policy.

**Why:** Re-importing or refreshing the source package can reintroduce blocked transitive versions, and bypassing the package firewall or enabling unreviewed install scripts is not appropriate.

**How to apply:** Preserve and review the root workspace overrides when updating Capacitor Assets, verify `pnpm install` and `assets:generate`, and do not run a Gradle/APK build in Replit.