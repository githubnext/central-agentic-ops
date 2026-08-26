---
checkout:
  repository: ${{ inputs.target_repo }}
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
  current: true
---