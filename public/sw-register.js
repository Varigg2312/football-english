// Extracted from an inline <script> block in index.html: the site's CSP
// (script-src 'self', no 'unsafe-inline'/nonce) silently blocks inline
// scripts, so this never actually ran in production — service worker
// registration and the offline/online banner listeners were both dead code
// despite looking correct in the markup. External same-origin files are
// unaffected by that restriction, hence moving this here instead of
// weakening the CSP.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW active.', reg))
            .catch(err => console.error('SW failed.', err));
    });
}
(function () {
    const banner = document.getElementById('offline-banner');
    function showBanner() { banner.classList.remove('hidden'); }
    function hideBanner() { banner.classList.add('hidden'); }
    window.addEventListener('offline', showBanner);
    window.addEventListener('online', hideBanner);
    if (!navigator.onLine) showBanner();
})();
