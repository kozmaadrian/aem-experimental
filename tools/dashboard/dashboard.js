const APP_BASE = 'https://da.live/app/kozmaadrian/aem-experimental/tools/';

function resolveAppHref(href) {
  const current = new URL(window.location.href);
  const target = new URL(href, APP_BASE);

  if (current.searchParams.get('ref') === 'local' && !target.searchParams.has('ref')) {
    target.searchParams.set('ref', 'local');
  }

  return target.href;
}

function preserveRefLocalOnLinks() {
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (href.startsWith('http://') || href.startsWith('https://')) return;
    a.setAttribute('href', resolveAppHref(href));
    a.setAttribute('target', '_top');
    a.setAttribute('rel', 'noopener');
  });
}

preserveRefLocalOnLinks();
