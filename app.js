const audioInput = document.getElementById("audioInput");
const coverInput = document.getElementById("coverInput");
const chooseAudioBtn = document.getElementById("chooseAudioBtn");
const changeCoverBtn = document.getElementById("changeCoverBtn");
const dropZone = document.getElementById("dropZone");
const editor = document.getElementById("editor");
const resetBtn = document.getElementById("resetBtn");

const audioPlayer = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const pauseIcon = document.getElementById("pauseIcon");
const progressFill = document.getElementById("progressFill");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

const coverArt = document.getElementById("coverArt");
const coverImage = document.getElementById("coverImage");

const titleInput = document.getElementById("titleInput");
const artistInput = document.getElementById("artistInput");
const albumInput = document.getElementById("albumInput");
const fileNameInput = document.getElementById("fileNameInput");
const extensionPreview = document.getElementById("extensionPreview");

const previewTitle = document.getElementById("previewTitle");
const previewArtist = document.getElementById("previewArtist");

const exportBtn = document.getElementById("exportBtn");
const formatCards = document.querySelectorAll(".format-card");
const formatNotice = document.getElementById("formatNotice");

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

let selectedAudioFile = null;
let selectedCoverBlob = null;
let selectedCoverMime = "image/jpeg";
let selectedFormat = "mp3";
let audioObjectUrl = null;
let coverObjectUrl = null;
let toastTimer = null;

/* =========================
   HELPERS
========================= */

function showToast(title, message, type = "success") {
  toastTitle.textContent = title;
  toastMessage.textContent = message;

  const icon = toast.querySelector(".toast-icon");
  icon.style.color = type === "error" ? "#ff7b86" : "var(--accent)";
  icon.style.background = type === "error"
    ? "rgba(255,95,109,.12)"
    : "rgba(216,255,79,.12)";

  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${mins}:${secs}`;
}

function cleanFileName(name) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "-") || "audio-baru";
}

function getAudioTitle(file) {
  return file.name.replace(/\.[^/.]+$/, "") || "Untitled Audio";
}

function setLoading(isLoading) {
  exportBtn.classList.toggle("loading", isLoading);
  exportBtn.disabled = isLoading;
}

/* =========================
   AUDIO UPLOAD
========================= */

chooseAudioBtn.addEventListener("click", () => {
  audioInput.click();
});

dropZone.addEventListener("click", (event) => {
  if (
    event.target.closest("button") ||
    event.target.closest("input")
  ) return;

  audioInput.click();
});

audioInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) loadAudio(file);
});

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];

  if (!file) return;

  if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|flac)$/i.test(file.name)) {
    showToast("File tidak didukung", "Pilih file audio yang valid.", "error");
    return;
  }

  loadAudio(file);
});

function loadAudio(file) {
  selectedAudioFile = file;

  if (audioObjectUrl) {
    URL.revokeObjectURL(audioObjectUrl);
  }

  audioObjectUrl = URL.createObjectURL(file);
  audioPlayer.src = audioObjectUrl;
  audioPlayer.load();

  const defaultTitle = getAudioTitle(file);

  titleInput.value = defaultTitle;
  artistInput.value = "";
  albumInput.value = "";
  fileNameInput.value = cleanFileName(defaultTitle);

  previewTitle.textContent = defaultTitle;
  previewArtist.textContent = "Unknown Artist";

  resetCover();

  editor.classList.remove("hidden");
  dropZone.classList.add("hidden");

  readMetadata(file);

  setTimeout(() => {
    editor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
}

/* =========================
   READ MP3 METADATA
========================= */

function readMetadata(file) {
  if (
    typeof jsmediatags === "undefined" ||
    !/\.mp3$/i.test(file.name)
  ) {
    return;
  }

  jsmediatags.read(file, {
    onSuccess: function(tag) {
      const tags = tag.tags || {};

      if (tags.title) {
        titleInput.value = tags.title;
      }

      if (tags.artist) {
        artistInput.value = tags.artist;
      }

      if (tags.album) {
        albumInput.value = tags.album;
      }

      const title = titleInput.value || "Untitled Audio";
      const artist = artistInput.value || "Unknown Artist";

      previewTitle.textContent = title;
      previewArtist.textContent = artist;

      if (tags.picture) {
        const picture = tags.picture;

        const byteArray = new Uint8Array(picture.data);
        const blob = new Blob([byteArray], {
          type: picture.format || "image/jpeg"
        });

        setCover(blob, picture.format || "image/jpeg");
      }
    },
    onError: function() {
      console.log("Metadata tidak tersedia.");
    }
  });
}

/* =========================
   COVER
========================= */

changeCoverBtn.addEventListener("click", () => {
  coverInput.click();
});

coverInput.addEventListener("change", event => {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Cover tidak valid", "Pilih file gambar.", "error");
    return;
  }

  setCover(file, file.type);
});

function setCover(blob, mime = "image/jpeg") {
  selectedCoverBlob = blob;
  selectedCoverMime = mime;

  if (coverObjectUrl) {
    URL.revokeObjectURL(coverObjectUrl);
  }

  coverObjectUrl = URL.createObjectURL(blob);
  coverImage.src = coverObjectUrl;
  coverArt.classList.add("has-image");
}

function resetCover() {
  selectedCoverBlob = null;
  selectedCoverMime = "image/jpeg";

  if (coverObjectUrl) {
    URL.revokeObjectURL(coverObjectUrl);
    coverObjectUrl = null;
  }

  coverImage.removeAttribute("src");
  coverArt.classList.remove("has-image");
}

/* =========================
   LIVE METADATA PREVIEW
========================= */

titleInput.addEventListener("input", () => {
  previewTitle.textContent = titleInput.value.trim() || "Untitled Audio";
});

artistInput.addEventListener("input", () => {
  previewArtist.textContent = artistInput.value.trim() || "Unknown Artist";
});

fileNameInput.addEventListener("input", () => {
  fileNameInput.value = fileNameInput.value.replace(/[\\/:*?"<>|]/g, "");
});

/* =========================
   AUDIO PLAYER
========================= */

playBtn.addEventListener("click", async () => {
  if (!audioPlayer.src) return;

  if (audioPlayer.paused) {
    try {
      await audioPlayer.play();
    } catch (error) {
      showToast("Tidak dapat memutar", "Browser menolak pemutaran audio.", "error");
    }
  } else {
    audioPlayer.pause();
  }
});

audioPlayer.addEventListener("play", () => {
  playIcon.style.display = "none";
  pauseIcon.style.display = "block";
});

audioPlayer.addEventListener("pause", () => {
  playIcon.style.display = "block";
  pauseIcon.style.display = "none";
});

audioPlayer.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  const percent = audioPlayer.duration
    ? (audioPlayer.currentTime / audioPlayer.duration) * 100
    : 0;

  progressFill.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("ended", () => {
  progressFill.style.width = "0%";
  currentTimeEl.textContent = "0:00";
});

document.querySelector(".progress-bar").addEventListener("click", event => {
  if (!audioPlayer.duration) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;

  audioPlayer.currentTime = percent * audioPlayer.duration;
});

/* =========================
   FORMAT SELECTOR
========================= */

formatCards.forEach(card => {
  card.addEventListener("click", () => {
    formatCards.forEach(item => item.classList.remove("active"));
    card.classList.add("active");

    selectedFormat = card.dataset.format;
    extensionPreview.textContent = `.${selectedFormat}`;

    if (selectedFormat === "mp3") {
      formatNotice.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 10v6M12 7.2v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <span>Cover dan metadata akan ditanamkan ke file MP3.</span>
      `;
    } else {
      formatNotice.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 10v6M12 7.2v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <span>M4A membutuhkan pemrosesan codec tambahan. Metadata bergantung pada dukungan format sumber.</span>
      `;
    }
  });
});

/* =========================
   MP3 EXPORT WITH ID3
========================= */

async function exportMP3() {
  if (!selectedAudioFile) {
    throw new Error("Belum ada audio.");
  }

  const title = titleInput.value.trim() || "Untitled Audio";
  const artist = artistInput.value.trim() || "Unknown Artist";
  const album = albumInput.value.trim() || "";
  const fileName = cleanFileName(fileNameInput.value || title);

  const originalBuffer = await selectedAudioFile.arrayBuffer();

  /*
    browser-id3-writer menyediakan ID3Writer untuk
    menulis metadata dan cover ke file MP3.
  */

  if (
    typeof ID3Writer === "undefined" ||
    !/\.mp3$/i.test(selectedAudioFile.name)
  ) {
    /*
      Jika sumber bukan MP3, kita tidak memaksakan
      metadata MP3 ke file lain.
    */
    downloadBlob(
      new Blob([originalBuffer], {
        type: selectedAudioFile.type || "audio/mpeg"
      }),
      `${fileName}.mp3`
    );

    return;
  }

  const writer = new ID3Writer(originalBuffer);

  writer
    .setFrame("TIT2", title)
    .setFrame("TPE1", [artist]);

  if (album) {
    writer.setFrame("TALB", album);
  }

  if (selectedCoverBlob) {
    const coverBuffer = await selectedCoverBlob.arrayBuffer();

    writer.setFrame("APIC", {
      type: 3,
      data: coverBuffer,
      description: "Cover",
      useUnicodeEncoding: false
    });
  }

  writer.addTag();

  const taggedBuffer = writer.arrayBuffer;

  downloadBlob(
    new Blob([taggedBuffer], { type: "audio/mpeg" }),
    `${fileName}.mp3`
  );
}

/* =========================
   EXPORT
========================= */

exportBtn.addEventListener("click", async () => {
  if (!selectedAudioFile) {
    showToast("Audio belum dipilih", "Silakan masukkan audio terlebih dahulu.", "error");
    return;
  }

  setLoading(true);

  try {
    /*
      MP3:
      - Jika input MP3, metadata + cover ditulis langsung.
      - Jika input bukan MP3, versi ini mengunduh data sumber
        dengan ekstensi MP3 sebagai fallback sederhana.
    */

    if (selectedFormat === "mp3") {
      await exportMP3();

      showToast(
        "Berhasil diekspor",
        "Audio MP3 siap diunduh."
      );
    }

    /*
      M4A:
      Konversi penuh memerlukan FFmpeg.wasm.
      Agar tidak mengklaim konversi palsu, versi ini
      memberi pemberitahuan bahwa konversi codec belum
      diaktifkan dalam build ringan ini.
    */

    if (selectedFormat === "m4a") {
      showToast(
        "M4A belum aktif",
        "Gunakan MP3 atau aktifkan FFmpeg untuk konversi M4A.",
        "error"
      );
    }

  } catch (error) {
    console.error(error);

    showToast(
      "Ekspor gagal",
      error.message || "Terjadi kesalahan saat memproses audio.",
      "error"
    );
  } finally {
    setLoading(false);
  }
});

/* =========================
   DOWNLOAD
========================= */

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* =========================
   RESET
========================= */

resetBtn.addEventListener("click", () => {
  audioPlayer.pause();

  if (audioObjectUrl) {
    URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = null;
  }

  selectedAudioFile = null;
  audioInput.value = "";
  coverInput.value = "";

  editor.classList.add("hidden");
  dropZone.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});});

audioInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) loadAudio(file);
});

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];

  if (!file) return;

  if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|flac)$/i.test(file.name)) {
    showToast("File tidak didukung", "Pilih file audio yang valid.", "error");
    return;
  }

  loadAudio(file);
});

function loadAudio(file) {
  selectedAudioFile = file;

  if (audioObjectUrl) {
    URL.revokeObjectURL(audioObjectUrl);
  }

  audioObjectUrl = URL.createObjectURL(file);
  audioPlayer.src = audioObjectUrl;
  audioPlayer.load();

  const defaultTitle = getAudioTitle(file);

  titleInput.value = defaultTitle;
  artistInput.value = "";
  albumInput.value = "";
  fileNameInput.value = cleanFileName(defaultTitle);

  previewTitle.textContent = defaultTitle;
  previewArtist.textContent = "Unknown Artist";

  resetCover();

  editor.classList.remove("hidden");
  dropZone.classList.add("hidden");

  readMetadata(file);

  setTimeout(() => {
    editor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
}

/* =========================
   READ MP3 METADATA
========================= */

function readMetadata(file) {
  if (
    typeof jsmediatags === "undefined" ||
    !/\.mp3$/i.test(file.name)
  ) {
    return;
  }

  jsmediatags.read(file, {
    onSuccess: function(tag) {
      const tags = tag.tags || {};

      if (tags.title) {
        titleInput.value = tags.title;
      }

      if (tags.artist) {
        artistInput.value = tags.artist;
      }

      if (tags.album) {
        albumInput.value = tags.album;
      }

      const title = titleInput.value || "Untitled Audio";
      const artist = artistInput.value || "Unknown Artist";

      previewTitle.textContent = title;
      previewArtist.textContent = artist;

      if (tags.picture) {
        const picture = tags.picture;

        const byteArray = new Uint8Array(picture.data);
        const blob = new Blob([byteArray], {
          type: picture.format || "image/jpeg"
        });

        setCover(blob, picture.format || "image/jpeg");
      }
    },
    onError: function() {
      console.log("Metadata tidak tersedia.");
    }
  });
}

/* =========================
   COVER
========================= */

changeCoverBtn.addEventListener("click", () => {
  coverInput.click();
});

coverInput.addEventListener("change", event => {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Cover tidak valid", "Pilih file gambar.", "error");
    return;
  }

  setCover(file, file.type);
});

function setCover(blob, mime = "image/jpeg") {
  selectedCoverBlob = blob;
  selectedCoverMime = mime;

  if (coverObjectUrl) {
    URL.revokeObjectURL(coverObjectUrl);
  }

  coverObjectUrl = URL.createObjectURL(blob);
  coverImage.src = coverObjectUrl;
  coverArt.classList.add("has-image");
}

function resetCover() {
  selectedCoverBlob = null;
  selectedCoverMime = "image/jpeg";

  if (coverObjectUrl) {
    URL.revokeObjectURL(coverObjectUrl);
    coverObjectUrl = null;
  }

  coverImage.removeAttribute("src");
  coverArt.classList.remove("has-image");
}

/* =========================
   LIVE METADATA PREVIEW
========================= */

titleInput.addEventListener("input", () => {
  previewTitle.textContent = titleInput.value.trim() || "Untitled Audio";
});

artistInput.addEventListener("input", () => {
  previewArtist.textContent = artistInput.value.trim() || "Unknown Artist";
});

fileNameInput.addEventListener("input", () => {
  fileNameInput.value = fileNameInput.value.replace(/[\\/:*?"<>|]/g, "");
});

/* =========================
   AUDIO PLAYER
========================= */

playBtn.addEventListener("click", async () => {
  if (!audioPlayer.src) return;

  if (audioPlayer.paused) {
    try {
      await audioPlayer.play();
    } catch (error) {
      showToast("Tidak dapat memutar", "Browser menolak pemutaran audio.", "error");
    }
  } else {
    audioPlayer.pause();
  }
});

audioPlayer.addEventListener("play", () => {
  playIcon.style.display = "none";
  pauseIcon.style.display = "block";
});

audioPlayer.addEventListener("pause", () => {
  playIcon.style.display = "block";
  pauseIcon.style.display = "none";
});

audioPlayer.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  const percent = audioPlayer.duration
    ? (audioPlayer.currentTime / audioPlayer.duration) * 100
    : 0;

  progressFill.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("ended", () => {
  progressFill.style.width = "0%";
  currentTimeEl.textContent = "0:00";
});

document.querySelector(".progress-bar").addEventListener("click", event => {
  if (!audioPlayer.duration) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;

  audioPlayer.currentTime = percent * audioPlayer.duration;
});

/* =========================
   FORMAT SELECTOR
========================= */

formatCards.forEach(card => {
  card.addEventListener("click", () => {
    formatCards.forEach(item => item.classList.remove("active"));
    card.classList.add("active");

    selectedFormat = card.dataset.format;
    extensionPreview.textContent = `.${selectedFormat}`;

    if (selectedFormat === "mp3") {
      formatNotice.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 10v6M12 7.2v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <span>Cover dan metadata akan ditanamkan ke file MP3.</span>
      `;
    } else {
      formatNotice.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 10v6M12 7.2v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        <span>M4A membutuhkan pemrosesan codec tambahan. Metadata bergantung pada dukungan format sumber.</span>
      `;
    }
  });
});

/* =========================
   MP3 EXPORT WITH ID3
========================= */

async function exportMP3() {
  if (!selectedAudioFile) {
    throw new Error("Belum ada audio.");
  }

  const title = titleInput.value.trim() || "Untitled Audio";
  const artist = artistInput.value.trim() || "Unknown Artist";
  const album = albumInput.value.trim() || "";
  const fileName = cleanFileName(fileNameInput.value || title);

  const originalBuffer = await selectedAudioFile.arrayBuffer();

  /*
    browser-id3-writer menyediakan ID3Writer untuk
    menulis metadata dan cover ke file MP3.
  */

  if (
    typeof ID3Writer === "undefined" ||
    !/\.mp3$/i.test(selectedAudioFile.name)
  ) {
    /*
      Jika sumber bukan MP3, kita tidak memaksakan
      metadata MP3 ke file lain.
    */
    downloadBlob(
      new Blob([originalBuffer], {
        type: selectedAudioFile.type || "audio/mpeg"
      }),
      `${fileName}.mp3`
    );

    return;
  }

  const writer = new ID3Writer(originalBuffer);

  writer
    .setFrame("TIT2", title)
    .setFrame("TPE1", [artist]);

  if (album) {
    writer.setFrame("TALB", album);
  }

  if (selectedCoverBlob) {
    const coverBuffer = await selectedCoverBlob.arrayBuffer();

    writer.setFrame("APIC", {
      type: 3,
      data: coverBuffer,
      description: "Cover",
      useUnicodeEncoding: false
    });
  }

  writer.addTag();

  const taggedBuffer = writer.arrayBuffer;

  downloadBlob(
    new Blob([taggedBuffer], { type: "audio/mpeg" }),
    `${fileName}.mp3`
  );
}

/* =========================
   EXPORT
========================= */

exportBtn.addEventListener("click", async () => {
  if (!selectedAudioFile) {
    showToast("Audio belum dipilih", "Silakan masukkan audio terlebih dahulu.", "error");
    return;
  }

  setLoading(true);

  try {
    /*
      MP3:
      - Jika input MP3, metadata + cover ditulis langsung.
      - Jika input bukan MP3, versi ini mengunduh data sumber
        dengan ekstensi MP3 sebagai fallback sederhana.
    */

    if (selectedFormat === "mp3") {
      await exportMP3();

      showToast(
        "Berhasil diekspor",
        "Audio MP3 siap diunduh."
      );
    }

    /*
      M4A:
      Konversi penuh memerlukan FFmpeg.wasm.
      Agar tidak mengklaim konversi palsu, versi ini
      memberi pemberitahuan bahwa konversi codec belum
      diaktifkan dalam build ringan ini.
    */

    if (selectedFormat === "m4a") {
      showToast(
        "M4A belum aktif",
        "Gunakan MP3 atau aktifkan FFmpeg untuk konversi M4A.",
        "error"
      );
    }

  } catch (error) {
    console.error(error);

    showToast(
      "Ekspor gagal",
      error.message || "Terjadi kesalahan saat memproses audio.",
      "error"
    );
  } finally {
    setLoading(false);
  }
});

/* =========================
   DOWNLOAD
========================= */

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* =========================
   RESET
========================= */

resetBtn.addEventListener("click", () => {
  audioPlayer.pause();

  if (audioObjectUrl) {
    URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = null;
  }

  selectedAudioFile = null;
  audioInput.value = "";
  coverInput.value = "";

  editor.classList.add("hidden");
  dropZone.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
    startPrayerClock();

    registerServiceWorker();

    console.log(
      "NurQ V3 ready"
    );
  }
);


/* =========================================================
   TIMEZONE FIRST ENTRY
   ========================================================= */

function showTimezoneSelector() {

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "timezoneModal";

  modal.className =
    "modal show";

  modal.innerHTML = `

    <div class="modal-sheet timezone-sheet">

      <div class="timezone-icon">
        🕌
      </div>

      <span class="section-kicker">
        PENGATURAN AWAL
      </span>

      <h2>
        Pilih zona waktu
      </h2>

      <p class="timezone-description">
        Zona waktu digunakan untuk
        menentukan waktu sholat dan
        alarm Adzan.
      </p>

      <div class="timezone-options">

        ${Object.entries(
          TIMEZONE_CONFIG
        ).map(
          ([key,item]) => `

          <button
            class="timezone-option"
            data-timezone="${key}"
          >

            <div class="timezone-icon-small">
              ${key === "WIB"
                ? "🌅"
                : key === "WITA"
                  ? "☀️"
                  : "🌇"}
            </div>

            <div>
              <strong>
                ${item.label}
              </strong>

              <span>
                ${item.name}
              </span>
            </div>

            <b>
              ›
            </b>

          </button>

        `
        ).join("")}

      </div>

      <small class="timezone-note">
        Kamu dapat mengubahnya kembali
        melalui Pengaturan.
      </small>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  $$(".timezone-option")
    .forEach(button => {

      button.onclick = async () => {

        const timezone =
          button.dataset.timezone;

        state.timezone =
          timezone;

        localStorage.setItem(
          "nurq_timezone",
          timezone
        );

        modal.remove();

        toast(
          `Zona waktu ${timezone} dipilih`
        );

        await loadPrayerTimes();
      };

    });
}


/* =========================================================
   QURAN API
   ========================================================= */

async function api(
  url
) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      15000
    );

  try {

    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const json =
      await response.json();

    if (
      !json ||
      json.code !== 200
    ) {
      throw new Error(
        "API error"
      );
    }

    return json.data;

  } finally {

    clearTimeout(
      timeout
    );
  }
}


/* =========================================================
   SURAH LIST
   ========================================================= */

async function loadSurahs() {

  const list =
    $("#surahList");

  if (list) {

    list.innerHTML = `
      <div class="bookmark-empty">
        ⏳
        <p>
          Memuat 114 surah...
        </p>
      </div>
    `;
  }

  try {

    state.surahs =
      await api(
        `${QURAN_API}/surah`
      );

    renderSurahs();

  } catch (error) {

    console.error(
      error
    );

    if (list) {

      list.innerHTML = `
        <div class="bookmark-empty">

          <div style="font-size:40px">
            ⚠️
          </div>

          <p>
            Gagal memuat surah.
          </p>

          <button
            class="adhan-test"
            id="retrySurahs"
          >
            Coba Lagi
          </button>

        </div>
      `;

      $("#retrySurahs")
        ?.addEventListener(
          "click",
          loadSurahs
        );
    }
  }
}


function renderSurahs(
  search = ""
) {

  const list =
    $("#surahList");

  if (!list) return;

  const q =
    search
      .toLowerCase()
      .trim();

  const filtered =
    state.surahs.filter(
      s =>
        !q ||
        s.englishName
          .toLowerCase()
          .includes(q) ||
        s.name
          .toLowerCase()
          .includes(q) ||
        String(s.number)
          .includes(q)
    );

  list.innerHTML =
    filtered.map(
      s => `

      <button
        class="surah-card"
        data-open-surah="${s.number}"
      >

        <div class="surah-number icon-3d">
          ${s.number}
        </div>

        <div class="surah-main">

          <strong>
            ${escapeHTML(
              s.englishName
            )}
          </strong>

          <span>
            ${s.revelationType}
            •
            ${s.numberOfAyahs}
            ayat
          </span>

        </div>

        <div class="surah-arabic">
          ${escapeHTML(
            s.name
          )}
        </div>

      </button>
    `
    ).join("");

  $$("[data-open-surah]")
    .forEach(button => {

      button.onclick =
        () => {

          openSurah(
            Number(
              button.dataset.openSurah
            )
          );

        };

    });
}


/* =========================================================
   OPEN SURAH
   ========================================================= */

async function openSurah(
  number
) {

  showPage("reader");

  $("#ayahList").innerHTML = `
    <div class="bookmark-empty">
      <div style="font-size:40px">
        📖
      </div>

      <p>
        Memuat ayat...
      </p>
    </div>
  `;

  try {

    const [
      arabic,
      latin,
      indo
    ] = await Promise.all([

      api(
        `${QURAN_API}/surah/${number}/quran-uthmani`
      ),

      api(
        `${QURAN_API}/surah/${number}/en.transliteration`
      ).catch(
        () => null
      ),

      api(
        `${QURAN_API}/surah/${number}/id.indonesian`
      ).catch(
        () => null
      )

    ]);

    state.current = {
      arabic,
      latin,
      indo
    };

    state.currentIndex = 0;

    $("#readerTitle").textContent =
      arabic.englishName;

    $("#readerArabicName").textContent =
      arabic.name;

    $("#readerTranslation").textContent =
      arabic.englishNameTranslation;

    $("#readerInfo").textContent =
      `${arabic.revelationType} • ` +
      `${arabic.numberOfAyahs} ayat`;

    renderAyahs();

    localStorage.setItem(
      "nurq_last_surah",
      number
    );

  } catch (error) {

    console.error(
      "SURAH ERROR:",
      error
    );

    $("#ayahList").innerHTML = `
      <div class="bookmark-empty">

        <div style="font-size:40px">
          ⚠️
        </div>

        <p>
          Gagal memuat ayat.
        </p>

        <button
          class="adhan-test"
          onclick="openSurah(${number})"
        >
          Muat ulang
        </button>

      </div>
    `;

  }
}


/* =========================================================
   AYAT RENDER
   ========================================================= */

function renderAyahs() {

  const arabic =
    state.current.arabic;

  const latin =
    state.current.latin;

  const indo =
    state.current.indo;

  $("#ayahList").innerHTML =
    arabic.ayahs.map(
      (ayah,index) => {

        const latinText =
          latin?.ayahs?.[index]
            ?.text ||
          "";

        const translation =
          indo?.ayahs?.[index]
            ?.text ||
          "";

        return `

        <article
          class="ayah"
          id="ayah-${index}"
          data-index="${index}"
        >

          <div class="ayah-head">

            <span class="ayah-number">
              ۞
              ${ayah.numberInSurah}
            </span>

            <button
              class="ayah-play icon-3d-button"
              data-ayah-play="${index}"
              aria-label="Putar ayat"
            >
              ▶
            </button>

          </div>

          <div class="ayah-arabic">
            ${escapeHTML(
              ayah.text
            )}
          </div>

          <div class="ayah-latin">
            ${escapeHTML(
              latinText
            )}
          </div>

          <div class="ayah-translation">
            ${escapeHTML(
              stripHTML(
                translation
              )
            )}
          </div>

          <div class="ayah-tools">

            <button
              class="round-btn icon-3d-button"
              data-ayah-play="${index}"
              title="Putar"
            >
              🔊
            </button>

            <button
              class="round-btn icon-3d-button"
              data-ayah-save="${index}"
              title="Simpan"
            >
              🔖
            </button>

            <button
              class="round-btn icon-3d-button"
              data-ayah-copy="${index}"
              title="Salin"
            >
              ⧉
            </button>

          </div>

        </article>
        `;
      }
    ).join("");

  /*
    PENTING:
    Semua tombol ▶ memakai data-index,
    bukan event card.
  */

  $$("[data-ayah-play]")
    .forEach(button => {

      button.onclick =
        event => {

          event.preventDefault();

          event.stopPropagation();

          const index =
            Number(
              button.dataset.ayahPlay
            );

          playAyah(
            index
          );

        };

    });

  $$("[data-ayah-save]")
    .forEach(button => {

      button.onclick =
        event => {

          event.stopPropagation();

          saveCurrentAyah(
            Number(
              button.dataset.ayahSave
            )
          );

        };

    });

  $$("[data-ayah-copy]")
    .forEach(button => {

      button.onclick =
        event => {

          event.stopPropagation();

          copyAyah(
            Number(
              button.dataset.ayahCopy
            )
          );

        };

    });
}


/* =========================================================
   PLAY AYAT
   ========================================================= */

async function playAyah(
  index
) {

  if (!state.current) {

    toast(
      "Pilih surah terlebih dahulu"
    );

    return;
  }

  const ayah =
    state.current
      .arabic
      .ayahs[index];

  if (!ayah) return;

  state.currentIndex =
    index;

  state.playing =
    true;

  highlightAyah(
    index
  );

  /*
    Stop current audio dahulu.
    Ini membuat tombol setiap ayat
    tidak bertabrakan.
  */

  audio.pause();

  audio.removeAttribute(
    "src"
  );

  audio.load();

  audio.src =
    `${AUDIO_BASE}/${ayah.number}.mp3`;

  audio.load();

  try {

    await audio.play();

    setPlayingButton(
      index,
      true
    );

  } catch (error) {

    console.error(
      "PLAY ERROR:",
      error
    );

    state.playing =
      false;

    toast(
      "Tekan ▶ sekali lagi untuk mengaktifkan audio"
    );
  }
}


/* =========================================================
   AUDIO ENDED
   ========================================================= */

audio.addEventListener(
  "ended",
  () => {

    setPlayingButton(
      state.currentIndex,
      false
    );

    if (
      state.autoNext &&
      state.current &&
      state.currentIndex <
        state.current.arabic.ayahs.length - 1
    ) {

      const next =
        state.currentIndex + 1;

      setTimeout(
        () => {

          playAyah(
            next
          );

        },
        350
      );

    } else {

      state.playing =
        false;

      $$(".ayah")
        .forEach(
          ayah =>
            ayah.classList.remove(
              "playing"
            )
        );

    }
  }
);


/* =========================================================
   PLAY BUTTON STATE
   ========================================================= */

function setPlayingButton(
  index,
  playing
) {

  $$("[data-ayah-play]")
    .forEach(
      button => {

        const same =
          Number(
            button.dataset.ayahPlay
          ) === index;

        if (same) {

          button.textContent =
            playing
              ? "Ⅱ"
              : "▶";

          button.classList.toggle(
            "is-playing",
            playing
          );
        }

      }
    );
}


/* =========================================================
   HIGHLIGHT
   ========================================================= */

function highlightAyah(
  index
) {

  $$(".ayah")
    .forEach(
      ayah =>
        ayah.classList.remove(
          "playing"
        )
    );

  const target =
    $(`#ayah-${index}`);

  if (!target) return;

  target.classList.add(
    "playing"
  );

  target.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  target.animate(
    [
      {
        transform:
          "scale(.97)",
        opacity: .65
      },
      {
        transform:
          "scale(1.025)",
        opacity: 1
      },
      {
        transform:
          "scale(1)",
        opacity: 1
      }
    ],
    {
      duration: 700,
      easing:
        "cubic-bezier(.2,.8,.2,1)"
    }
  );
}


/* =========================================================
   WHOLE SURAH
   ========================================================= */

function playWholeSurah() {

  if (!state.current) {

    toast(
      "Pilih surah terlebih dahulu"
    );

    return;
  }

  state.autoNext =
    true;

  playAyah(
    0
  );

  toast(
    "Bacaan otomatis dimulai"
  );
}


$("#playSurah")
  ?.addEventListener(
    "click",
    playWholeSurah
  );


$("#pauseSurah")
  ?.addEventListener(
    "click",
    () => {

      audio.pause();

      state.playing =
        false;

      setPlayingButton(
        state.currentIndex,
        false
      );

      toast(
        "Bacaan dijeda"
      );

    }
  );


$("#stopSurah")
  ?.addEventListener(
    "click",
    () => {

      audio.pause();

      audio.currentTime =
        0;

      state.playing =
        false;

      $$(".ayah")
        .forEach(
          el =>
            el.classList.remove(
              "playing"
            )
        );

      setPlayingButton(
        state.currentIndex,
        false
      );

    }
  );


/* =========================================================
   AYAT PILIHAN
   ========================================================= */

function initDailyVerse() {

  const playButton =
    document.querySelector(
      "[data-demo-audio]"
    );

  if (!playButton) return;

  /*
    Jangan hardcode global ayat
    yang tidak sesuai teks.
    Kita ambil ayat 94:6 sebagai
    contoh konsisten.
  */

  playButton.onclick =
    async () => {

      try {

        /*
          Al-Insyirah ayat 6
        */

        const data =
          await api(
            `${QURAN_API}/surah/94/quran-uthmani`
          );

        const ayah =
          data.ayahs[5];

        audio.pause();

        audio.src =
          `${AUDIO_BASE}/${ayah.number}.mp3`;

        audio.load();

        await audio.play();

        playButton.textContent =
          "Ⅱ";

        toast(
          "Ayat pilihan sedang dibaca"
        );

        audio.onended =
          () => {

            playButton.textContent =
              "▶";

          };

      } catch (error) {

        console.error(
          error
        );

        toast(
          "Audio ayat pilihan gagal"
        );
      }
    };
}


/* =========================================================
   BOOKMARK
   ========================================================= */

function saveCurrentAyah(
  index
) {

  if (!state.current)
    return;

  const ayah =
    state.current
      .arabic
      .ayahs[index];

  const exists =
    state.bookmarks.some(
      item =>
        item.globalNumber ===
        ayah.number
    );

  if (exists) {

    state.bookmarks =
      state.bookmarks.filter(
        item =>
          item.globalNumber !==
          ayah.number
      );

    toast(
      "Ayat dihapus"
    );

  } else {

    state.bookmarks.push({
      globalNumber:
        ayah.number,

      surah:
        state.current
          .arabic
          .englishName,

      ayah:
        ayah.numberInSurah,

      text:
        ayah.text
    });

    toast(
      "Ayat disimpan 🔖"
    );
  }

  localStorage.setItem(
    "nurq_bookmarks",
    JSON.stringify(
      state.bookmarks
    )
  );
}


async function copyAyah(
  index
) {

  const ayah =
    state.current
      .arabic
      .ayahs[index];

  try {

    await navigator.clipboard.writeText(
      ayah.text
    );

    toast(
      "Ayat berhasil disalin"
    );

  } catch {

    toast(
      "Tidak bisa menyalin"
    );
  }
}


/* =========================================================
   TIMEZONE + PRAYER
   ========================================================= */

async function loadPrayerTimes() {

  if (!state.timezone) {
    return;
  }

  if (!navigator.geolocation) {

    return prayerRequest(
      -6.2,
      106.816666
    );
  }

  navigator.geolocation
    .getCurrentPosition(
      position => {

        prayerRequest(
          position.coords.latitude,
          position.coords.longitude
        );

      },

      () => {

        prayerRequest(
          -6.2,
          106.816666
        );

      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
}


async function prayerRequest(
  lat,
  lon
) {

  try {

    const date =
      getLocalDateString();

    const url =
      `https://api.aladhan.com/v1/timings/${date}` +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&method=20`;

    const response =
      await fetch(url);

    const json =
      await response.json();

    if (!json.data) {
      throw new Error(
        "Prayer API failed"
      );
    }

    window.prayerData =
      json.data.timings;

    renderPrayer(
      json.data.timings
    );

    updateNextPrayer();

  } catch (error) {

    console.error(
      "PRAYER ERROR",
      error
    );

    toast(
      "Gagal mengambil waktu sholat"
    );
  }
}


function getLocalDateString() {

  /*
    API date mengikuti tanggal lokal
    yang dipilih pengguna.
  */

  const now =
    new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          getIANATimezone(),
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    ).formatToParts(now);

  const day =
    parts.find(
      p => p.type === "day"
    ).value;

  const month =
    parts.find(
      p => p.type === "month"
    ).value;

  const year =
    parts.find(
      p => p.type === "year"
    ).value;

  return `${day}-${month}-${year}`;
}


function getIANATimezone() {

  if (state.timezone === "WITA")
    return "Asia/Makassar";

  if (state.timezone === "WIT")
    return "Asia/Jayapura";

  return "Asia/Jakarta";
}


function renderPrayer(
  timings
) {

  const names = {
    Fajr: "Subuh",
    Dhuhr: "Dzuhur",
    Asr: "Ashar",
    Maghrib: "Maghrib",
    Isha: "Isya"
  };

  const list =
    $("#prayerList");

  if (!list) return;

  list.innerHTML =
    Object.entries(names)
      .map(
        ([key,name]) => `

        <div
          class="prayer-row"
          data-prayer="${key}"
        >

          <span class="symbol icon-3d">
            ☪
          </span>

          <span class="name">
            ${name}
          </span>

          <span class="time">
            ${timings[key]}
          </span>

        </div>
      `
      )
      .join("");
}


function getNowForTimezone() {

  return new Date(
    new Date().toLocaleString(
      "en-US",
      {
        timeZone:
          getIANATimezone()
      }
    )
  );
}


function getPrayerList() {

  if (!window.prayerData)
    return [];

  const map = {
    Fajr: "Subuh",
    Dhuhr: "Dzuhur",
    Asr: "Ashar",
    Maghrib: "Maghrib",
    Isha: "Isya"
  };

  return Object.entries(map)
    .map(
      ([key,name]) => {

        const [h,m] =
          window.prayerData[key]
            .split(":")
            .map(Number);

        const date =
          getNowForTimezone();

        date.setHours(
          h,
          m,
          0,
          0
        );

        return {
          key,
          name,
          time:
            window.prayerData[key],
          date
        };
      }
    );
}


function updateNextPrayer() {

  const prayers =
    getPrayerList();

  if (!prayers.length)
    return;

  const now =
    getNowForTimezone();

  let next =
    prayers.find(
      p =>
        p.date > now
    );

  if (!next) {

    next =
      prayers[0];

    next.date.setDate(
      next.date.getDate() + 1
    );
  }

  if ($("#nextPrayerName")) {

    $("#nextPrayerName")
      .textContent =
      next.name;
  }

  if ($("#nextPrayerTime")) {

    $("#nextPrayerTime")
      .textContent =
      next.time;
  }

  $$(".prayer-row")
    .forEach(row => {

      row.classList.toggle(
        "active",
        row.dataset.prayer ===
          next.key
      );

    });

  updateCountdown(
    next.date
  );
}


function updateCountdown(
  target
) {

  const now =
    getNowForTimezone();

  const diff =
    target - now;

  if (diff <= 0)
    return;

  const total =
    Math.floor(
      diff / 1000
    );

  const h =
    Math.floor(
      total / 3600
    );

  const m =
    Math.floor(
      (total % 3600) / 60
    );

  const s =
    total % 60;

  if ($("#countdown")) {

    $("#countdown")
      .textContent =
      `${String(h).padStart(2,"0")}:` +
      `${String(m).padStart(2,"0")}:` +
      `${String(s).padStart(2,"0")}`;
  }
}


/* =========================================================
   ADHAN
   ========================================================= */

function startPrayerClock() {

  setInterval(
    () => {

      updateNextPrayer();

      checkAdhan();

    },
    1000
  );
}


function checkAdhan() {

  if (!state.adhanEnabled)
    return;

  const prayers =
    getPrayerList();

  const now =
    getNowForTimezone();

  const hour =
    now.getHours();

  const minute =
    now.getMinutes();

  const second =
    now.getSeconds();

  /*
    Hanya trigger di detik 0-4
    supaya tidak berulang setiap detik.
  */

  if (second > 4)
    return;

  const current =
    prayers.find(
      prayer => {

        const h =
          prayer.date
            .getHours();

        const m =
          prayer.date
            .getMinutes();

        return (
          h === hour &&
          m === minute
        );
      }
    );

  if (!current)
    return;

  const key =
    `${now.toDateString()}-` +
    `${current.key}-` +
    state.timezone;

  if (
    state.lastAdhanKey === key
  )
    return;

  state.lastAdhanKey =
    key;

  playAdhan(
    current.name
  );
}


async function playAdhan(
  prayerName
) {

  try {

    audio.pause();

    audio.src =
      ADHAN_URL;

    audio.load();

    await audio.play();

    toast(
      `🔊 Adzan ${prayerName}`
    );

    showAdhanOverlay(
      prayerName
    );

  } catch (error) {

    console.error(
      "ADHAN ERROR",
      error
    );

    showAdhanOverlay(
      prayerName,
      true
    );

    toast(
      `Waktu ${prayerName} telah masuk`
    );
  }
}


function showAdhanOverlay(
  name,
  blocked = false
) {

  const old =
    document.getElementById(
      "adhanOverlay"
    );

  old?.remove();

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "adhanOverlay";

  overlay.className =
    "adhan-overlay";

  overlay.innerHTML = `

    <div class="adhan-popup">

      <div class="adhan-orb">
        ☪
      </div>

      <span>
        WAKTU SHOLAT
      </span>

      <h2>
        ${name}
      </h2>

      <p>
        ${blocked
          ? "Tekan tombol di bawah untuk memutar Adzan."
          : "Saatnya menunaikan sholat."}
      </p>

      <button
        id="playAdhanNow"
        class="adhan-main-button"
      >
        🔊
        ${blocked
          ? "Putar Adzan"
          : "Buka Sholat"}
      </button>

      <button
        id="closeAdhan"
        class="adhan-close"
      >
        Matikan
      </button>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  $("#playAdhanNow")
    .onclick =
    () => {

      audio.src =
        ADHAN_URL;

      audio.play();

      toast(
        `Adzan ${name}`
      );
    };

  $("#closeAdhan")
    .onclick =
    () => {

      audio.pause();

      overlay.remove();

    };
}


/* =========================================================
   SETTINGS
   ========================================================= */

function initSettings() {

  $("#settingsBtn")
    ?.addEventListener(
      "click",
      () => {

        $("#settingsModal")
          ?.classList.add(
            "show"
          );

      }
    );

  $("#fontPlus")
    ?.addEventListener(
      "click",
      () => {

        state.fontSize =
          Math.min(
            50,
            state.fontSize + 2
          );

        applyFont();
      }
    );

  $("#fontMinus")
    ?.addEventListener(
      "click",
      () => {

        state.fontSize =
          Math.max(
            20,
            state.fontSize - 2
          );

        applyFont();
      }
    );

  /*
    Tambahkan timezone selector
    ke settings jika element tersedia.
  */

  const adhanToggle =
    $("#adhanToggle");

  if (adhanToggle) {

    state.adhanEnabled =
      localStorage.getItem(
        "nurq_adhan"
      ) === "true";

    adhanToggle.checked =
      state.adhanEnabled;

    adhanToggle.onchange =
      event => {

        state.adhanEnabled =
          event.target.checked;

        localStorage.setItem(
          "nurq_adhan",
          state.adhanEnabled
        );

        if (
          state.adhanEnabled
        ) {

          requestNotificationPermission();

          toast(
            "Alarm Adzan aktif"
          );

        } else {

          toast(
            "Alarm Adzan dimatikan"
          );
        }
      };
  }
}


function applyFont() {

  document.documentElement
    .style
    .setProperty(
      "--arabic-size",
      `${state.fontSize}px`
    );

  if ($("#fontValue")) {

    $("#fontValue")
      .textContent =
      state.fontSize;
  }

  localStorage.setItem(
    "nurq_font_size",
    state.fontSize
  );
}


/* =========================================================
   NAV
   ========================================================= */

function initNavigation() {

  $$("[data-page]")
    .forEach(
      button => {

        button.onclick =
          () => {

            showPage(
              button.dataset.page
            );

          };
      }
    );

  $("#readerBack")
    ?.addEventListener(
      "click",
      () =>
        showPage("quran")
    );

  $("#continueBtn")
    ?.addEventListener(
      "click",
      () => {

        openSurah(
          Number(
            localStorage.getItem(
              "nurq_last_surah"
            ) || 1
          )
        );

      }
    );
}


function showPage(
  page
) {

  $$(".page")
    .forEach(
      p =>
        p.classList.remove(
          "active"
        )
    );

  const target =
    $(`#${page}Page`);

  target?.classList.add(
    "active"
  );

  $$(".nav-item")
    .forEach(
      item => {

        item.classList.toggle(
          "active",
          item.dataset.page ===
            page
        );

      }
    );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   SEARCH
   ========================================================= */

function initSearch() {

  $("#surahSearch")
    ?.addEventListener(
      "input",
      e =>
        renderSurahs(
          e.target.value
        )
    );
}


/* =========================================================
   AYAT BUTTONS
   ========================================================= */

function initAyahButtons() {

  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-ayah-play]"
        );

      if (!button)
        return;

      event.preventDefault();
      event.stopPropagation();

      playAyah(
        Number(
          button.dataset.ayahPlay
        )
      );

    }
  );
}


/* =========================================================
   MODAL
   ========================================================= */

function initModals() {

  $$("[data-close]")
    .forEach(
      button => {

        button.onclick =
          () => {

            button
              .closest(".modal")
              ?.classList.remove(
                "show"
              );

          };

      }
    );

  $$(".modal")
    .forEach(
      modal => {

        modal.addEventListener(
          "click",
          event => {

            if (
              event.target === modal
            ) {

              modal.classList.remove(
                "show"
              );
            }

          }
        );

      }
    );
}


/* =========================================================
   NOTIFICATION / SERVICE WORKER
   ========================================================= */

async function requestNotificationPermission() {

  if (
    "Notification" in window &&
    Notification.permission ===
      "default"
  ) {

    try {

      await Notification.requestPermission();

    } catch {}
  }
}


async function registerServiceWorker() {

  if (
    "serviceWorker" in navigator
  ) {

    try {

      await navigator.serviceWorker
        .register(
          "./sw.js"
        );

      console.log(
        "Service Worker aktif"
      );

    } catch (error) {

      console.warn(
        "SW gagal:",
        error
      );
    }
  }
}


/* =========================================================
   UTILITIES
   ========================================================= */

function toast(
  message
) {

  const el =
    $("#toast");

  if (!el) return;

  el.textContent =
    message;

  el.classList.add(
    "show"
  );

  clearTimeout(
    window.__toast
  );

  window.__toast =
    setTimeout(
      () => {

        el.classList.remove(
          "show"
        );

      },
      2500
    );
}


function stripHTML(
  html
) {

  const div =
    document.createElement(
      "div"
    );

  div.innerHTML =
    html || "";

  return (
    div.textContent || ""
  );
}


function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
   }
