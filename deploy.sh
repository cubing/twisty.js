#!/bin/bash

# Yeah, yeah, not elegant. But it works.
MANIFEST_FILE="inc/cache.manifest"
REVISION=`cat ${MANIFEST_FILE} | grep "Revision" | sed "s/# Revision //"`
REVISION_NEXT=$((REVISION+1))
echo "Incrementing from revision ${REVISION} to revision ${REVISION_NEXT}."
NEW_CACHE_MANIFEST=`cat "${MANIFEST_FILE}" | sed "s/Revision ${REVISION}/Revision ${REVISION_NEXT}/"`
echo "${NEW_CACHE_MANIFEST}" > "${MANIFEST_FILE}"


# Currently only works for lgarron.
rsync -avz . lusaka.dreamhost.com:~/cubing.net/twisty.js