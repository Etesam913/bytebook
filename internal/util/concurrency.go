package util

import "runtime"

var MAX_JOBS = 100

// Based on CPU cores (good starting point)
var WORKER_COUNT = runtime.NumCPU() * 2 // 2x for I/O-bound work
