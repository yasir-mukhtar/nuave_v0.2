#!/usr/bin/env sh
# Download Pexels photos by ID into <post-folder>/img/pexels-<id>.jpg.
# The Pexels API is not needed: the ID is the number at the end of a photo
# page link, e.g. pexels.com/photo/woman-in-pink-hijab-...-13502903/.
#
#   pexels.sh <post-folder> <id> [<id> ...]          full size (1800px wide)
#   PREVIEW=1 pexels.sh <post-folder> <id> [...]     small previews in preview/
set -eu
[ $# -ge 2 ] || { echo "usage: pexels.sh <post-folder> <id> [<id> ...]" >&2; exit 2; }
dir=$1; shift
if [ "${PREVIEW:-}" = 1 ]; then out="$dir/preview"; w=400; else out="$dir/img"; w=1800; fi
mkdir -p "$out"
for id in "$@"; do
  curl -fsS -o "$out/pexels-$id.jpg" \
    "https://images.pexels.com/photos/$id/pexels-photo-$id.jpeg?auto=compress&cs=tinysrgb&w=$w"
  echo "$out/pexels-$id.jpg"
done
