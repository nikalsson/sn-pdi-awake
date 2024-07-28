#!/bin/bash

# Define log file paths
log_file="/srv/sn-pdi-waker/operation_log.txt"
npm_log_file="/var/log/npm-start.log"

# Function to get the current time in the desired format
current_time() {
    date +"%Y-%m-%d %H:%M:%S.%3N"
}

# Log start time
echo "$(current_time)  >> STARTING SHELL SCRIPT" >> "$log_file"
echo "$(current_time)  >> STARTING sn-pdi-waker SHELL SCRIPT"

# Check if Xvfb is already running on display :99
if pgrep -x "Xvfb" > /dev/null && [ "$(pgrep -x "Xvfb" | xargs -n1 ps -p | grep -c ' :99 ')" -gt 0 ]; then
    echo "$(current_time)  >> Xvfb is already running on display :99" >> "$log_file"
else
    # Start xvfb and set DISPLAY
    Xvfb :99 -screen 0 1280x720x24 &
    xvfb_pid=$!
    export DISPLAY=:99
    echo "$(current_time)  >> Started Xvfb with PID $xvfb_pid" >> "$log_file"
fi

# Navigate to the directory and run npm start
cd /srv/sn-pdi-waker
/usr/bin/npm start >> "$npm_log_file" 2>&1

# Capture the exit status of npm start
status=$?

# Log end time and exit status
if [ $status -eq 0 ]; then
    echo "$(current_time)  >> EXITING SHELL SCRIPT, SUCCESSFUL" >> "$log_file"
    echo "$(current_time)  >> EXITING sn-pdi-waker SHELL SCRIPT, SUCCESSFUL"
else
    echo "$(current_time)  >> EXITING SHELL SCRIPT, FAILED WITH STATUS $status" >> "$log_file"
    echo "$(current_time)  >> EXITING sn-pdi-waker SHELL SCRIPT, FAILED WITH STATUS $status"
fi

# Stop xvfb if it was started by this script
if [ -n "$xvfb_pid" ]; then
    kill $xvfb_pid
    echo "$(current_time)  >> Stopped Xvfb with PID $xvfb_pid" >> "$log_file"
fi
