
  // Kunci JWPlayer
  jwplayer.key = "uoW6qHjBL3KNudxKVnwa3rt5LlTakbko9e6aQ6VUyKQ=";

  // Referensi elemen
  const jwplayerContainer = document.getElementById('jwplayer-container');
  const episodeList = document.getElementById('episode-list');
  const titleElement = document.getElementById('dynamic-video-title');
  const batchDownloadList = document.getElementById('batch-download-list');
  const batchTitleElement = document.getElementById('dynamic-batch-title');

  // Variabel global
  let domains = [];
  let jwPlayerInstance;

  // Fungsi loadDomains (Tidak berubah)
  async function loadDomains() {
    try {
      const response = await fetch('/domains.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      domains = await response.json();
      console.log("Domains loaded:", domains.length);
    } catch (error) {
      console.error("Gagal memuat daftar domain:", error);
    }
  }

  // Fungsi getRandomDomain (Tidak berubah)
  async function getRandomDomain() {
    if (domains.length === 0) await loadDomains();
    if (domains.length === 0) {
      console.error("Daftar domain kosong setelah mencoba memuat.");
      return "";
    }
    return domains[Math.floor(Math.random() * domains.length)];
  }

  // --- MODIFIKASI DI SINI ---
  // Fungsi loadEpisode (Menggunakan kelas '.playing' sesuai CSS)
  async function loadEpisode(encodedPath, episodeTitle) {
    if (!jwplayerContainer) return;

    try {
      const episodePath = atob(encodedPath);
      let fullUrl = episodePath;

      if (episodePath.startsWith("kdrive/")) {
        const randomDomain = await getRandomDomain();
        if (!randomDomain) {
           console.error("Tidak dapat domain acak untuk episode.");
           jwplayerContainer.innerHTML = '<p class="error-message">Error: Server video episode tidak tersedia.</p>';
           return;
        }
        fullUrl = randomDomain + episodePath;
      }

      if (jwPlayerInstance) {
        try { jwPlayerInstance.remove(); } catch(e) { /* abaikan */ }
        jwPlayerInstance = null;
      }

      jwPlayerInstance = jwplayer('jwplayer-container').setup({
          file: fullUrl,
          title: episodeTitle,
          width: '100%',
          aspectratio: '16:9'
      });

      jwPlayerInstance.on('error', (e) => {
          console.error('JWPlayer Error:', e);
          jwplayerContainer.innerHTML = `<p class="error-message">Gagal memuat video: ${e.message || 'Kesalahan tidak diketahui'}</p>`;
      });

      jwPlayerInstance.on('ready', () => console.log(`JWPlayer siap untuk: ${episodeTitle}`));

      // --- Manajemen Kelas 'playing' (sesuai CSS Anda) ---
      if (episodeList) {
          // 1. Cari elemen yang saat ini punya kelas 'playing'
          const currentPlaying = episodeList.querySelector('.episode-item.playing');
          // 2. Jika ada, hapus kelas 'playing' darinya
          if (currentPlaying) currentPlaying.classList.remove('playing'); // Gunakan 'playing'

          // 3. Cari elemen list yang sesuai dengan episode yg AKAN dimuat
          const targetItem = episodeList.querySelector(`.episode-item[data-path="${encodedPath}"]`);
          // 4. Jika elemen target ditemukan, tambahkan kelas 'playing' padanya
          if (targetItem) {
              targetItem.classList.add('playing'); // Gunakan 'playing'
          } else {
              // Pesan jika elemen tidak ditemukan
              console.warn("Tidak dapat menemukan elemen list yang sesuai untuk ditandai playing:", episodeTitle);
          }
      }
      // --- Akhir Manajemen Kelas 'playing' ---

    } catch (error) {
      console.error("Error di loadEpisode:", error);
      let errorMsg = "Gagal memuat episode ini.";
       if (error instanceof DOMException && error.name === 'InvalidCharacterError') {
        errorMsg = "Terjadi kesalahan data pada episode ini (base64 tidak valid).";
      } else if (error.message.includes("atob")) {
        errorMsg = "Format data episode tidak valid.";
      } else {
         errorMsg = `Gagal memproses episode. Error: ${error.message}`;
      }
      if (jwplayerContainer) jwplayerContainer.innerHTML = `<p class="error-message">${errorMsg}</p>`;
    }
  }
  // --- AKHIR MODIFIKASI ---

  // Fungsi handleBatchDownloadClick (Tidak berubah)
  async function handleBatchDownloadClick(event) {
    const listItemElement = event.currentTarget;
    const encodedUrl = listItemElement.dataset.encodedUrl;
    if (!encodedUrl) { alert("Terjadi kesalahan: URL download tidak ditemukan."); return; }
    let originalUrl;
    try { originalUrl = atob(encodedUrl); }
    catch (error) { alert("Terjadi kesalahan: Format URL download tidak valid."); return; }
    if (originalUrl.startsWith("kdrive/")) {
        const randomDomain = await getRandomDomain();
        if (!randomDomain) { alert("Gagal memulai download batch: Server tidak valid. Coba lagi nanti."); return; }
        const fullUrl = randomDomain + originalUrl;
        console.log("Membuka batch dari domain acak:", fullUrl);
        window.open(fullUrl, '_blank');
    } else {
        console.log("Membuka batch dari URL langsung:", originalUrl);
        window.open(originalUrl, '_blank');
    }
  }

  // Fungsi loadVideoData (Tidak berubah dari versi sebelumnya)
  async function loadVideoData() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlValue = urlParams.get('url');

    if (!jwplayerContainer || !episodeList || !titleElement || !batchDownloadList || !batchTitleElement) {
      console.error("Elemen penting tidak ditemukan.");
      if (titleElement) titleElement.textContent = "Error: Struktur halaman tidak lengkap.";
      if (jwplayerContainer) jwplayerContainer.innerHTML = '<p class="error-message">Error: Elemen halaman penting tidak dapat dimuat.</p>';
      return;
    }

    batchDownloadList.style.display = 'none';
    batchTitleElement.style.display = 'none';

    if (!urlValue) {
      console.error("Parameter 'url' tidak ditemukan.");
      titleElement.textContent = "Video tidak ditentukan";
      episodeList.innerHTML = "<p>Tidak ada video yang dipilih.</p>";
      jwplayerContainer.innerHTML = "<p>Tidak ada video yang dipilih.</p>";
      return;
    }

    const videoDataFile = `/video/${urlValue}.json`;
    const formattedTitle = urlValue.replace(/-/g, ' ');
    console.log("Memuat data dari:", videoDataFile);

    try {
      const response = await fetch(videoDataFile);
      if (!response.ok) throw new Error(`Gagal memuat file (${response.status}): ${videoDataFile}`);
      const videoItems = await response.json();
      if (!Array.isArray(videoItems)) throw new Error("Format data JSON tidak valid.");

      episodeList.innerHTML = '';
      batchDownloadList.innerHTML = '';
      titleElement.textContent = '';
      batchTitleElement.textContent = '';

      let lastValidEpisodeItem = null;
      let episodeCount = 0;
      let batchLinksFound = false;

      videoItems.forEach((item, index) => {
        if (!item) { console.warn(`Data item kosong pada index ${index}`); return; }

        if (typeof item.title === 'string' && typeof item.path === 'string') {
          episodeCount++;
          const listItem = document.createElement('li');
          listItem.textContent = item.title;
          listItem.classList.add('episode-item');
          try {
             const encodedPath = btoa(item.path);
             listItem.dataset.path = encodedPath;
             listItem.addEventListener('click', () => {
                loadEpisode(encodedPath, item.title); // Panggil loadEpisode saat diklik
             });
             episodeList.appendChild(listItem);
             lastValidEpisodeItem = { encodedPath, title: item.title };
          } catch (error) {
              console.error(`Gagal encode path episode '${item.title}' (index ${index}):`, item.path, error);
              const errorItem = document.createElement('li');
              errorItem.textContent = `${item.title} (Error Data)`;
              errorItem.classList.add('error-item');
              episodeList.appendChild(errorItem);
          }
        }
        else if (typeof item.quality === 'string' && typeof item.url === 'string') {
          batchLinksFound = true;
          const listItem = document.createElement('li');
          listItem.textContent = item.quality;
          if (item.size) { listItem.textContent += ` (${item.size})`; }
          listItem.classList.add('batch-item');
          try {
             const encodedBatchUrl = btoa(item.url);
             listItem.dataset.encodedUrl = encodedBatchUrl;
             listItem.addEventListener('click', handleBatchDownloadClick);
             batchDownloadList.appendChild(listItem);
          } catch (error) {
              console.error(`Gagal encode URL batch '${item.quality}' (index ${index}):`, item.url, error);
              const errorItem = document.createElement('li');
              errorItem.textContent = `${item.quality} (Error Data)`;
              errorItem.classList.add('error-item');
              batchDownloadList.appendChild(errorItem);
          }
        } else {
          console.warn(`Format data item tidak dikenali pada index ${index}:`, item);
        }
      });

      if (episodeCount > 0) {
          titleElement.textContent = `Nonton ${formattedTitle} Episode 1-${episodeCount}`;
      } else if (batchLinksFound) { titleElement.textContent = `Download Batch ${formattedTitle}`; }
      else { titleElement.textContent = `Informasi ${formattedTitle}`; }

      if (lastValidEpisodeItem) {
          console.log("Memuat episode terakhir:", lastValidEpisodeItem.title);
          loadEpisode(lastValidEpisodeItem.encodedPath, lastValidEpisodeItem.title); // Panggil loadEpisode
      } else if (episodeCount === 0 && batchLinksFound) { jwplayerContainer.innerHTML = '<p>Tidak ada episode streaming. Gunakan link download batch.</p>'; }
      else if (episodeCount === 0 && !batchLinksFound) { jwplayerContainer.innerHTML = '<p>Konten tidak tersedia.</p>'; }

      if (batchLinksFound) {
          batchTitleElement.textContent = `Download Batch ${formattedTitle}`;
          batchTitleElement.style.display = '';
          batchDownloadList.style.display = '';
      } else {
          batchTitleElement.style.display = 'none';
          batchDownloadList.style.display = 'none';
      }

    } catch (error) {
      console.error("Gagal memuat atau memproses data video:", videoDataFile, error);
      titleElement.textContent = `Gagal Memuat ${formattedTitle}`;
      const errorMessage = `<p class="error-message">Gagal memuat data video. ${error.message}. Coba muat ulang halaman.</p>`;
      episodeList.innerHTML = errorMessage;
      jwplayerContainer.innerHTML = errorMessage;
      batchTitleElement.style.display = 'none';
      batchDownloadList.style.display = 'none';
    }
  }

  // Panggil inisialisasi saat DOM siap
  document.addEventListener('DOMContentLoaded', () => {
    loadDomains().then(loadVideoData);
  });
