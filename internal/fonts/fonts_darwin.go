package fonts

/*
#cgo LDFLAGS: -framework CoreText -framework CoreFoundation
#include <CoreText/CoreText.h>
#include <stdlib.h>

static char *familyName(CFArrayRef families, CFIndex index) {
    CFStringRef name = (CFStringRef)CFArrayGetValueAtIndex(families, index);
    CFIndex size = CFStringGetMaximumSizeForEncoding(CFStringGetLength(name), kCFStringEncodingUTF8) + 1;
    char *buffer = malloc(size);
    if (buffer && !CFStringGetCString(name, buffer, size, kCFStringEncodingUTF8)) {
        free(buffer);
        return NULL;
    }
    return buffer;
}
*/
import "C"

import (
	"fmt"
	"unsafe"
)

func systemFamilies() ([]string, error) {
	families := C.CTFontManagerCopyAvailableFontFamilyNames()
	if families == 0 {
		return nil, fmt.Errorf("CoreText returned no font collection")
	}
	defer C.CFRelease(C.CFTypeRef(families))
	result := make([]string, 0, int(C.CFArrayGetCount(families)))
	for i := C.CFIndex(0); i < C.CFArrayGetCount(families); i++ {
		name := C.familyName(families, i)
		if name == nil {
			continue
		}
		result = append(result, C.GoString(name))
		C.free(unsafe.Pointer(name))
	}
	return result, nil
}
