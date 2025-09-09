(async () => {
  try {
    const url = 'http://10.121.8.134:4310/dashboard-islands';
    console.log('Fetching', url);
    const res = await fetch(url, { method: 'GET' });
    console.log('STATUS', res.status, res.statusText);
    const text = await res.text();
    console.log('LENGTH', text.length);
    console.log('PREVIEW_START');
    console.log(text.slice(0, 400));
    console.log('PREVIEW_END');
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
