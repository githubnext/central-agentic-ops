---
import-schema:
  package:
    type: string
    required: true
  role:
    type: choice
    options: [orchestrator, worker]
    required: true
  worker:
    type: string
    default: "__none__"
  dispatch_max:
    type: string
    default: "1"
  orchestrator_credits:
    type: string
    default: "0"
  worker_credits_per_target:
    type: string
    default: "0"

imports:
  - uses: control.md
    with:
      package: ${{ github.aw.import-inputs.package }}
      role: ${{ github.aw.import-inputs.role }}
      worker: ${{ github.aw.import-inputs.worker }}
      dispatch_max: ${{ github.aw.import-inputs.dispatch_max }}
      orchestrator_credits: ${{ github.aw.import-inputs.orchestrator_credits }}
      worker_credits_per_target: ${{ github.aw.import-inputs.worker_credits_per_target }}
---
