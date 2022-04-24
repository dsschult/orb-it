#!/bin/bash

CASE="${1:-default}"
echo "Seeding test case '$CASE'"

python -m testdata.$CASE
