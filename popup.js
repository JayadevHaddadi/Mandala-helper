document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('open-app-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
            } else {
                window.open('index.html', '_blank');
            }
        });
    }
});
