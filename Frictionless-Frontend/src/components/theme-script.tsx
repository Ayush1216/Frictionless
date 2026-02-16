export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function() {
  const key = 'ui-store';
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      const theme = parsed?.state?.theme;
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  } catch (e) {}
})();`,
      }}
    />
  );
}
