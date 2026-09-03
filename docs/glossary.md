---
title: Glossary
description: Definitions for Central Agentic Ops terminology.
---

## Control plane

The repository that hosts CAO workflows and policy. It coordinates work across explicitly enrolled target repositories.

## Dispatcher

A mechanism that starts a worker workflow. Dispatching is one responsibility of an orchestrator; it is not a synonym for the orchestrator itself.

## Operation

A bounded repository-management capability, implemented by an orchestrator and one or more workers.

## Orchestrator

The workflow that discovers, filters, ranks, selects, and dispatches work within resolved policy. An orchestrator does not mutate target repositories directly.

Use **orchestrator** as the preferred term for this workflow.

## Package

A distributable collection of an operation's workflows, shared dependencies, and manifest.

## Safe output

A declared, bounded way for a workflow to produce an external effect, such as creating an issue or dispatching a worker.

## Target repository

A repository enrolled for an operation. A target can provide data and receive declared safe outputs, but does not run the control plane's workflows.

## Worker

A workflow that receives one selected target and performs one bounded task. Workers revalidate their control envelope and can only narrow the policy they receive.
