package util

import "runtime"

// Based on CPU cores (good starting point)
var WORKER_COUNT = runtime.NumCPU() * 2 // 2x for I/O-bound work
