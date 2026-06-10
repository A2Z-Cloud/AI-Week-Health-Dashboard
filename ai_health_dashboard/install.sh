#!/bin/bash
set -e

echo "Building Vue project..."
cd vue
npm run build

echo "Packing ZET server..."
cd ..
zet pack
