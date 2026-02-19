export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function() {
  var key = 'ui-store';
  try {
    var stored = localStorage.getItem(key);
    if (stored) {
      var parsed = JSON.parse(stored);
      var theme = parsed?.state?.theme;
      var root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
      root.setAttribute('data-theme', theme || 'dark');
    }
  } catch (e) {}
})();`,
      }}
    />
  );
}
