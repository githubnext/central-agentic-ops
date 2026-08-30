---
title: Control Policy
description: Understand where Central Agentic Ops policy is defined and which layer owns each decision.
sidebar:
  order: 1361
---

# Control Policy

`.github/central-agentic-ops.json` is the sole persistent non-secret CAO policy authority: CAO governs rollout and target authority, while gh-aw governs engine limits, generated job topology, authentication, and safe-output execution. For the normative architecture, requirements, and compliance tests, see the [Central Agentic Ops Control Architecture Specification](https://github.com/githubnext/central-agentic-ops/blob/main/specs/control-architecture.md).