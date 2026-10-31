#!/bin/sh
# Staging helper only: download the original SBA-approved archive.
# DO NOT PUBLISH A CERTIFICATION BADGE BEFORE SBA VETCERT APPROVAL.
set -eu
mkdir -p prelaunch/vetcert/assets
curl --fail --location --retry 3 \
  'https://legacy.sba.gov/sites/default/files/2024-05/decals-and-icons.zip' \
  --output prelaunch/vetcert/assets/sba-decals-and-icons.zip
echo 'Downloaded the official SBA icon package. Inspect its contents and select only the correct VOSB version.'
unzip -l prelaunch/vetcert/assets/sba-decals-and-icons.zip
