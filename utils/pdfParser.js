function getPdfjsLib() {
  if (typeof pdfjsLib !== 'undefined') return Promise.resolve(pdfjsLib);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('lib/pdf.min.js');
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js'));
    document.head.appendChild(script);
  });
}

async function parsePDF(file) {
  const pdfjs = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
}
