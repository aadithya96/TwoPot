#!/usr/bin/env bash
#
# Clone all of your forked GitLab repositories, or update them if already cloned.
# For existing clones: fetches the upstream (the repo you forked from) and
# rebases the local main branch on top of upstream/main.
#
# Requirements:
#   - curl, jq, git
#   - GITLAB_TOKEN env var: a personal access token with `read_api` scope
#
# Usage:
#   GITLAB_TOKEN=xxxx ./clone-forks-gitlab.sh [destination-dir]
#
# Optional env vars:
#   GITLAB_HOST   - defaults to gitlab.com
#   MAIN_BRANCH   - branch to rebase, defaults to main
#   CLONE_PROTOCOL - "ssh" or "https", defaults to ssh

set -euo pipefail

GITLAB_HOST="${GITLAB_HOST:-gitlab.com}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
CLONE_PROTOCOL="${CLONE_PROTOCOL:-ssh}"
DEST_DIR="${1:-$HOME/gitlab-forks}"

if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  echo "Error: GITLAB_TOKEN is not set. Create one at https://${GITLAB_HOST}/-/profile/personal_access_tokens with 'read_api' scope." >&2
  exit 1
fi

for cmd in curl jq git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' is not installed." >&2
    exit 1
  fi
done

mkdir -p "$DEST_DIR"

API="https://${GITLAB_HOST}/api/v4"

echo "Fetching your projects from ${GITLAB_HOST}..."

page=1
forks_json="[]"
while true; do
  response=$(curl -s --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "${API}/projects?membership=true&owned=true&simple=false&per_page=100&page=${page}")

  count=$(echo "$response" | jq 'length')
  if [[ "$count" -eq 0 ]]; then
    break
  fi

  forks_json=$(jq -s '.[0] + .[1]' <(echo "$forks_json") <(echo "$response"))
  page=$((page + 1))
done

# Keep only projects that are forks (have a forked_from_project)
forks=$(echo "$forks_json" | jq -c '[.[] | select(.forked_from_project != null)]')
fork_count=$(echo "$forks" | jq 'length')

if [[ "$fork_count" -eq 0 ]]; then
  echo "No forked repositories found."
  exit 0
fi

echo "Found ${fork_count} forked repositories."

echo "$forks" | jq -c '.[]' | while read -r project; do
  name=$(echo "$project" | jq -r '.path')
  path_with_namespace=$(echo "$project" | jq -r '.path_with_namespace')

  if [[ "$CLONE_PROTOCOL" == "https" ]]; then
    origin_url=$(echo "$project" | jq -r '.http_url_to_repo')
    upstream_url=$(echo "$project" | jq -r '.forked_from_project.http_url_to_repo')
  else
    origin_url=$(echo "$project" | jq -r '.ssh_url_to_repo')
    upstream_url=$(echo "$project" | jq -r '.forked_from_project.ssh_url_to_repo')
  fi

  local_dir="${DEST_DIR}/${name}"

  echo ""
  echo "=== ${path_with_namespace} ==="

  if [[ -d "$local_dir/.git" ]]; then
    echo "Already cloned at ${local_dir}, updating..."
    git -C "$local_dir" remote set-url origin "$origin_url"

    if git -C "$local_dir" remote get-url upstream >/dev/null 2>&1; then
      git -C "$local_dir" remote set-url upstream "$upstream_url"
    else
      git -C "$local_dir" remote add upstream "$upstream_url"
    fi

    git -C "$local_dir" fetch upstream
    git -C "$local_dir" fetch origin

    if ! git -C "$local_dir" rev-parse --verify "$MAIN_BRANCH" >/dev/null 2>&1; then
      echo "Local branch '${MAIN_BRANCH}' does not exist in ${local_dir}, skipping rebase."
      continue
    fi

    git -C "$local_dir" checkout "$MAIN_BRANCH"
    if git -C "$local_dir" rebase "upstream/${MAIN_BRANCH}"; then
      echo "Rebased ${name} onto upstream/${MAIN_BRANCH}."
    else
      echo "Rebase conflict in ${name}; resolve manually, then 'git rebase --continue'." >&2
      git -C "$local_dir" rebase --abort
    fi
  else
    echo "Cloning into ${local_dir}..."
    git clone "$origin_url" "$local_dir"
    git -C "$local_dir" remote add upstream "$upstream_url"
    git -C "$local_dir" fetch upstream
  fi
done

echo ""
echo "Done."
