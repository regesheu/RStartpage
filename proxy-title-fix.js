(() => {
  const heading = document.getElementById('pageTitle');
  if (!heading) return;

  const shortenTitle = () => {
    const current = heading.textContent.trim();
    if (/профил/i.test(current)) {
      if (current !== 'Прокси') heading.textContent = 'Прокси';
      return;
    }
    if (/profile/i.test(current) && current !== 'Proxy') {
      heading.textContent = 'Proxy';
    }
  };

  shortenTitle();
  new MutationObserver(shortenTitle).observe(heading, {
    childList: true,
    characterData: true,
    subtree: true,
  });
})();
