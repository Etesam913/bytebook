#!/bin/bash

cd ../
wails dev &
sleep 5
cd frontend
pnpm run test
