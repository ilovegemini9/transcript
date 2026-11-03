document.getElementById('save').addEventListener('click', async () => {
  const status = document.getElementById('status');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) { status.textContent = 'Could not read this tab.'; return; }
  try {
    const current = new URL(tab.url);
    if (!/(^|\.)tiktok\.com$/i.test(current.hostname)) {
      status.textContent = 'Open a public TikTok video first.';
      return;
    }
    const key = 'cliptext_library_v2';
    const stored = await chrome.storage.local.get(key);
    const links = stored[key] || [];
    if (links.some(item => item.url === tab.url)) {
      status.textContent = 'This link is already saved.';
      return;
    }
    links.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), url: tab.url, createdAt: Date.now() });
    await chrome.storage.local.set({ [key]: links });
    status.textContent = 'Saved. Opening your ClipText workspace…';
    await chrome.tabs.create({ url: 'https://transcriptiktok.vercel.app/app.html?url=' + encodeURIComponent(tab.url) });
  } catch (error) {
    status.textContent = 'Could not save this link.';
  }
});
