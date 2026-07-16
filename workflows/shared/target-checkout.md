---
checkout:
  repository: ${{ inputs.target_repo }}
  github-app:
    client-id: ${{ vars.GH_AW_GITHUB_APP_ID }}
    private-key: ${{ secrets.GH_AW_GITHUB_APP_PRIVATE_KEY }}
    repositories: ["*"]
  current: true
---