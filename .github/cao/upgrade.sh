#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

extension_upgrade_error="$(mktemp)"
trap 'rm -f "$extension_upgrade_error"' EXIT

if ! gh extension upgrade github/gh-aw 2> >(tee "$extension_upgrade_error" >&2); then
  if grep -qi "SAML" "$extension_upgrade_error"; then
    curl -fsSL https://raw.githubusercontent.com/github/gh-aw/main/install-gh-aw.sh | bash
  else
    exit 1
  fi
fi

rm -f "$extension_upgrade_error"
trap - EXIT

gh aw update --major --cool-down 0
gh aw upgrade
