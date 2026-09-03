#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

gh extension upgrade github/gh-aw
gh aw update --major --cool-down 0
gh aw upgrade
