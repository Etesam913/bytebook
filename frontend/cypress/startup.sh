#!/bin/bash

cd ../
wails dev &
sleep 10
cd frontend
pnpm run test
