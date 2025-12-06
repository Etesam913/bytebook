// Apply dark mode immediately to prevent white flash on page load
function initTheme() {
  try {
    // Check localStorage for cached theme preference
    const cachedTheme = localStorage.getItem('bytebook-theme-preference');
    let shouldBeDark = false;

    if (cachedTheme === 'dark') {
      shouldBeDark = true;
    } else if (cachedTheme === 'light') {
      shouldBeDark = false;
    } else if (cachedTheme === 'system' || !cachedTheme) {
      // Fall back to system preference if no cache or system preference
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch {
    // If localStorage is not available, fall back to system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  }
}

initTheme();
