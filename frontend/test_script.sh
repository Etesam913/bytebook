#!/bin/bash

# Ensure the script exits if any command fails
set -e

# Run the first pnpm command (e.g., starting a server) and redirect both stdout and stderr to a temporary file
# Consider using `unbuffer` or `stdbuf` to avoid output buffering issues
cd .. && unbuffer wails dev 2>&1 | tee /tmp/pnpm_output.txt &

PORT=5173

kill_process_by_port() {
    # Find PID using port number
    PID=$(lsof -t -i:$PORT)
    
    # Check if PID was found
    if [ ! -z "$PID" ]; then
        echo "Killing process on port $PORT with PID $PID"
        kill $PID || echo "Failed to kill process $PID"
    else
        echo "No process found running on port $PORT"
    fi
}


# Function to clean up before exit
cleanup() {
  rm -f /tmp/pnpm_output.txt
  # Other cleanup commands can go here
  kill_process_by_port
}

# Trap EXIT signal to ensure cleanup runs even if the script exits unexpectedly
trap cleanup EXIT

# Wait for the desired output
while true; do
  if grep -q "To develop in the browser and call your bound Go methods from Javascript, navigate to" /tmp/pnpm_output.txt; then
    echo "Desired text found, running the next command..."
    pnpm cypress run
    break
  fi
  sleep 1 # Check every second
done

# Note: The cleanup function will automatically remove the temp file when the script exits
