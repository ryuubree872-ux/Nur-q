/* =========================================================
   NURQ
   Quran + Tajwid + Prayer Times + Adhan Alarm
   ========================================================= */

const API = "https://api.alquran.cloud/v1";
const PRAYER_API = "https://api.aladhan.com/v1";

const state = {
  surahs: [],
  currentSurah: null,
  currentAyah: 0,
  playing: false,
  audioQueue: [],
  audioIndex: 0,
  prayers: null,
  coordinates: null,
  bookmarks: JSON.parse(localStorage.getItem("nurq_bookmarks") || "[]"),
  settings: {
    animation: true,
    autoNext: true,
    fontSize: 30,
    adhan: false
  }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const audio = $("#audioPlayer");


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  bindNavigation();
  bindGlobalButtons();
  bindSettings();
  bindLessons();

  loadSettings();
  renderBookmarks();

  await loadSurahs();
  await loadPrayerTimes();

  updateClock();
  setInterval(updateClock, 1000);
  setInterval(checkPrayerAlarm, 1000);
});


/* =========================================================
   NAVIGATION
   ========================================================= */

function bindNavigation() {

  $$("[data-page]").forEach(button => {

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      if (!page) return;

      showPage(page);
    });
  });

  $("#readerBack").addEventListener("click", () => {
    showPage("quran");
  });
}


function showPage(page) {

  $$(".page").forEach(p => {
    p.classList.remove("active");
  });

  const target = $(`#${page}Page`);

  if (target) {
    target.classList.add("active");
  }

  $$(".nav-item").forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.page === page
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (page === "bookmarks") {
    renderBookmarks();
  }
}


/* =========================================================
   SURAH DATA
   ========================================================= */

async function loadSurahs() {

  try {

    const response = await fetch(
      `${API}/surah`
    );

    const json = await response.json();

    state.surahs = json.data || [];

    renderSurahs();

  } catch (error) {

    toast("Gagal memuat daftar surah");
    console.error(error);
  }
}


function renderSurahs(filter = "") {

  const list = $("#surahList");

  const normalized = filter
    .toLowerCase()
    .trim();

  const filtered = state.surahs.filter(surah => {

    return (
      surah.englishName.toLowerCase().includes(normalized) ||
      surah.name.toLowerCase().includes(normalized) ||
      String(surah.number).includes(normalized)
    );
  });

  list.innerHTML = filtered.map(surah => `

    <button class="surah-card" data-surah="${surah.number}">

      <div class="surah-number">
        ${surah.number}
      </div>

      <div class="surah-main">
        <strong>${escapeHTML(surah.englishName)}</strong>
        <span>
          ${surah.revelationType} • ${surah.numberOfAyahs} ayat
        </span>
      </div>

      <div class="surah-arabic">
        ${escapeHTML(surah.name)}
      </div>

    </button>

  `).join("");

  $$(".surah-card").forEach(card => {

    card.addEventListener("click", () => {

      openSurah(
        Number(card.dataset.surah)
      );

    });

  });
}


$("#surahSearch")?.addEventListener("input", e => {
  renderSurahs(e.target.value);
});


/* =========================================================
   OPEN SURAH
   ========================================================= */

async function openSurah(number) {

  showPage("reader");

  $("#ayahList").innerHTML = `
    <div class="bookmark-empty">
      Memuat ayat...
    </div>
  `;

  try {

    const url =
      `${API}/surah/${number}/editions/quran-uthmani,en.transliteration,id.indonesian`;

    const response = await fetch(url);
    const json = await response.json();

    const editions = json.data;

    const arabic = editions.find(
      e => e.identifier === "quran-uthmani"
    );

    const transliteration = editions.find(
      e => e.identifier === "en.transliteration"
    );

    const indonesia = editions.find(
      e => e.identifier === "id.indonesian"
    );

    state.currentSurah = {
      number,
      arabic,
      transliteration,
      indonesia
    };

    state.currentAyah = 0;

    $("#readerTitle").textContent =
      arabic.englishName;

    $("#readerArabicName").textContent =
      arabic.name;

    $("#readerTranslation").textContent =
      arabic.englishNameTranslation;

    $("#readerInfo").textContent =
      `${arabic.revelationType} • ${arabic.numberOfAyahs} ayat`;

    renderAyahs();

    localStorage.setItem(
      "nurq_last_surah",
      String(number)
    );

  } catch (error) {

    console.error(error);

    toast("Gagal memuat surah");
  }
}


/* =========================================================
   AYAH
   ========================================================= */

function renderAyahs() {

  const { arabic, transliteration, indonesia } =
    state.currentSurah;

  const html = arabic.ayahs.map((ayah, index) => {

    const latin =
      transliteration?.ayahs?.[index]?.text || "";

    const translation =
      indonesia?.ayahs?.[index]?.text || "";

    return `

      <article
        class="ayah"
        id="ayah-${index}"
        data-index="${index}"
      >

        <div class="ayah-head">

          <span class="ayah-number">
            ۞ ${ayah.numberInSurah}
          </span>

          <button
            class="ayah-play"
            data-play="${index}"
          >
            ▶
          </button>

        </div>

        <div class="ayah-arabic">
          ${escapeHTML(ayah.text)}
        </div>

        <div class="ayah-latin">
          ${escapeHTML(latin)}
        </div>

        <div class="ayah-translation">
          ${escapeHTML(stripHTML(translation))}
        </div>

      </article>
    `;

  }).join("");

  $("#ayahList").innerHTML = html;

  $$("[data-play]").forEach(button => {

    button.addEventListener("click", e => {

      e.stopPropagation();

      playAyah(
        Number(button.dataset.play)
      );
    });

  });

  $$(".ayah").forEach(card => {

    card.addEventListener("click", () => {

      const index =
        Number(card.dataset.index);

      playAyah(index);

    });

  });
}


/* =========================================================
   QURAN AUDIO
   =========================================================

   Al Quran Cloud menyediakan audio per ayat.
   ar.alafasy = Mishary Alafasy.

   Format:
   https://cdn.islamic.network/quran/audio/128/ar.alafasy/{ayah}.mp3

   ========================================================= */

function getAudioURL(globalAyahNumber) {

  return (
    `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`
  );
}


function playAyah(index) {

  if (!state.currentSurah) return;

  const ayah =
    state.currentSurah.arabic.ayahs[index];

  if (!ayah) return;

  state.currentAyah = index;
  state.playing = true;

  highlightAyah(index);

  audio.src =
    getAudioURL(ayah.number);

  audio.play()
    .then(() => {
      animateReading(index);
    })
    .catch(() => {

      toast(
        "Tekan tombol play untuk mengizinkan audio"
      );

    });
}


function highlightAyah(index) {

  $$(".ayah").forEach(el => {
    el.classList.remove("playing");
  });

  const target =
    $(`#ayah-${index}`);

  if (!target) return;

  target.classList.add("playing");

  target.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


function animateReading(index) {

  if (!state.settings.animation) return;

  const target =
    $(`#ayah-${index}`);

  if (!target) return;

  target.animate(
    [
      {
        transform: "scale(.98)",
        opacity: ".65"
      },
      {
        transform: "scale(1.015)",
        opacity: "1"
      },
      {
        transform: "scale(1)",
        opacity: "1"
      }
    ],
    {
      duration: 750,
      easing: "cubic-bezier(.2,.8,.2,1)"
    }
  );
}


audio.addEventListener("ended", () => {

  if (!state.currentSurah) return;

  if (
    state.settings.autoNext &&
    state.currentAyah <
      state.currentSurah.arabic.ayahs.length - 1
  ) {

    playAyah(
      state.currentAyah + 1
    );

  } else {

    state.playing = false;

    $$(".ayah").forEach(el => {
      el.classList.remove("playing");
    });

  }
});


$("#playSurah").addEventListener("click", () => {

  if (!state.currentSurah) return;

  playAyah(state.currentAyah);

});


$("#pauseSurah").addEventListener("click", () => {

  audio.pause();

  state.playing = false;

});


$("#stopSurah").addEventListener("click", () => {

  audio.pause();
  audio.currentTime = 0;
  state.playing = false;

  $$(".ayah").forEach(el => {
    el.classList.remove("playing");
  });

});


/* =========================================================
   PRAYER TIMES
   ========================================================= */

async function loadPrayerTimes() {

  if (!navigator.geolocation) {

    await loadPrayerByDefault();
    return;
  }

  navigator.geolocation.getCurrentPosition(

    async position => {

      state.coordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };

      $("#locationText").textContent =
        "Lokasi perangkat";

      await fetchPrayerTimes(
        position.coords.latitude,
        position.coords.longitude
      );

    },

    async () => {

      $("#locationText").textContent =
        "Lokasi tidak diizinkan";

      await loadPrayerByDefault();

    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }

  );
}


async function loadPrayerByDefault() {

  /*
    Default Indonesia.
    Pengguna tetap bisa menekan tombol lokasi
    untuk menggunakan GPS.
  */

  await fetchPrayerTimes(
    -6.200000,
    106.816666
  );

  $("#locationText").textContent =
    "Jakarta, Indonesia";
}


async function fetchPrayerTimes(lat, lon) {

  const now = new Date();

  const day =
    String(now.getDate()).padStart(2, "0");

  const month =
    String(now.getMonth() + 1).padStart(2, "0");

  const year =
    now.getFullYear();

  const date =
    `${day}-${month}-${year}`;

  const url =
    `${PRAYER_API}/timings/${date}` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&method=20` +
    `&school=0`;

  try {

    const response =
      await fetch(url);

    const json =
      await response.json();

    state.prayers =
      json.data.timings;

    renderPrayerTimes();

    updateNextPrayer();

  } catch (error) {

    console.error(error);

    toast(
      "Gagal mengambil waktu sholat"
    );

  }
}


const prayerMap = {
  Fajr: "Subuh",
  Dhuhr: "Dzuhur",
  Asr: "Ashar",
  Maghrib: "Maghrib",
  Isha: "Isya"
};


function renderPrayerTimes() {

  if (!state.prayers) return;

  const list =
    $("#prayerList");

  list.innerHTML =
    Object.entries(prayerMap)
      .map(([key, name]) => {

        return `

          <div
            class="prayer-row"
            data-prayer="${key}"
          >

            <span class="symbol">☪</span>

            <span class="name">
              ${name}
            </span>

            <span class="time">
              ${state.prayers[key]}
            </span>

          </div>

        `;

      }).join("");
}


function getPrayerObjects() {

  if (!state.prayers) return [];

  return Object.entries(prayerMap)
    .map(([key, name]) => {

      const [hour, minute] =
        state.prayers[key]
          .split(":")
          .map(Number);

      const date = new Date();

      date.setHours(
        hour,
        minute,
        0,
        0
      );

      return {
        key,
        name,
        time: state.prayers[key],
        date
      };

    });
}


function updateNextPrayer() {

  const prayers =
    getPrayerObjects();

  if (!prayers.length) return;

  const now = new Date();

  let next =
    prayers.find(
      prayer => prayer.date > now
    );

  if (!next) {

    next = prayers[0];

    next.date =
      new Date(
        next.date.getTime() +
        86400000
      );
  }

  $("#nextPrayerName").textContent =
    next.name;

  $("#nextPrayerTime").textContent =
    next.time;

  prayers.forEach(prayer => {

    const row =
      document.querySelector(
        `[data-prayer="${prayer.key}"]`
      );

    if (row) {

      row.classList.toggle(
        "active",
        prayer.key === next.key
      );
    }
  });
}


function updateClock() {

  updateNextPrayer();

  const prayers =
    getPrayerObjects();

  if (!prayers.length) return;

  const now = new Date();

  let next =
    prayers.find(
      prayer => prayer.date > now
    );

  if (!next) {

    next = prayers[0];

    next.date =
      new Date(
        next.date.getTime() +
        86400000
      );
  }

  const diff =
    next.date - now;

  if (diff <= 0) return;

  const totalSeconds =
    Math.floor(diff / 1000);

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  $("#countdown").textContent =
    `${String(hours).padStart(2,"0")}:` +
    `${String(minutes).padStart(2,"0")}:` +
    `${String(seconds).padStart(2,"0")}`;
}


/* =========================================================
   ADHAN ALARM
   =========================================================

   Browser mobile memiliki batasan autoplay.
   User perlu mengaktifkan alarm / melakukan interaksi
   terlebih dahulu agar audio dapat dimainkan.
   ========================================================= */

const ADHAN_URL =
  "https://cdn.islamic.network/adhan/adhan.mp3";

let lastAlarmKey = "";


$("#adhanToggle").addEventListener(
  "change",
  e => {

    state.settings.adhan =
      e.target.checked;

    saveSettings();

    if (e.target.checked) {

      toast(
        "Alarm Adzan aktif"
      );

    } else {

      toast(
        "Alarm Adzan dimatikan"
      );
    }
  }
);


$("#testAdhan").addEventListener(
  "click",
  async () => {

    try {

      audio.src = ADHAN_URL;

      await audio.play();

      toast("Adzan sedang diputar");

    } catch {

      toast(
        "Browser memblokir audio. Tekan tombol lagi."
      );

    }
  }
);


function checkPrayerAlarm() {

  if (!state.settings.adhan) return;

  const prayers =
    getPrayerObjects();

  const now = new Date();

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  prayers.forEach(prayer => {

    const [hour, minute] =
      prayer.time.split(":")
        .map(Number);

    const target =
      hour * 60 + minute;

    const key =
      `${now.toDateString()}-${prayer.key}`;

    if (
      current === target &&
      lastAlarmKey !== key
    ) {

      lastAlarmKey = key;

      playAdhan();
    }

  });
}


function playAdhan() {

  audio.src = ADHAN_URL;

  audio.play()
    .then(() => {

      toast(
        "🔊 Waktu " +
        getCurrentPrayerName() +
        " telah masuk"
      );

    })
    .catch(() => {

      toast(
        "Waktu sholat masuk. Tekan layar untuk memutar Adzan."
      );

    });
}


function getCurrentPrayerName() {

  const prayers =
    getPrayerObjects();

  const now = new Date();

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  const prayer =
    prayers.find(p => {

      const [h,m] =
        p.time.split(":").map(Number);

      return h * 60 + m === current;
    });

  return prayer?.name || "sholat";
}


/* =========================================================
   TAJWID LESSONS
   ========================================================= */

const lessons = {

  nun: {
    title: "Nun Sukun & Tanwin",

    description:
      "Nun sukun (نْ) dan tanwin memiliki beberapa hukum bacaan berdasarkan huruf setelahnya.",

    rules: [
      "Izhar Halqi — dibaca jelas ketika bertemu ء ه ع ح غ خ.",
      "Idgham — melebur ke huruf tertentu.",
      "Iqlab — nun/tanwin berubah menjadi mim ketika bertemu ب.",
      "Ikhfa — dibaca samar dengan dengung pada huruf-huruf tertentu."
    ],

    example:
      "مِنْ بَعْدِ"
  },

  mim: {
    title: "Mim Sukun",

    description:
      "Mim sukun memiliki tiga hukum utama.",

    rules: [
      "Ikhfa Syafawi — mim sukun bertemu ب.",
      "Idgham Mimi — mim sukun bertemu م.",
      "Izhar Syafawi — mim sukun bertemu selain ب dan م."
    ],

    example:
      "تَرْمِيهِمْ بِحِجَارَةٍ"
  },

  mad: {
    title: "Mad",

    description:
      "Mad adalah memanjangkan suara pada huruf mad sesuai hukum dan jumlah harakatnya.",

    rules: [
      "Mad Thabi'i — umumnya 2 harakat.",
      "Mad Wajib Muttasil — huruf mad bertemu hamzah dalam satu kata.",
      "Mad Jaiz Munfasil — huruf mad bertemu hamzah di kata berikutnya.",
      "Mad Lazim — memiliki panjang bacaan tertentu sesuai jenisnya."
    ],

    example:
      "جَاءَ"
  },

  ghunnah: {
    title: "Ghunnah",

    description:
      "Ghunnah adalah suara dengung yang keluar dari khaisyum (rongga hidung). Pada nun dan mim bertasydid, ghunnah dibaca dengan jelas.",

    rules: [
      "Nun tasydid نّ memiliki ghunnah.",
      "Mim tasydid مّ memiliki ghunnah.",
      "Ikhfa juga memiliki karakter dengung.",
      "Durasi bacaan harus mengikuti kaidah tajwid yang dipelajari."
    ],

    example:
      "إِنَّ — ثُمَّ"
  },

  qalqalah: {
    title: "Qalqalah",

    description:
      "Qalqalah adalah pantulan suara pada huruf ق ط ب ج د ketika huruf tersebut sukun.",

    rules: [
      "Qalqalah Sughra terjadi ketika huruf qalqalah bersukun di tengah bacaan.",
      "Qalqalah Kubra terjadi ketika berhenti pada huruf qalqalah.",
      "Pantulan tidak boleh berubah menjadi harakat baru."
    ],

    example:
      "يَجْعَلْ"
  },

  waqaf: {
    title: "Waqaf",

    description:
      "Waqaf adalah berhenti pada bacaan. Tanda-tanda waqaf membantu pembaca menentukan tempat berhenti yang tepat.",

    rules: [
      "م — waqaf lazim.",
      "لا — jangan berhenti.",
      "ج — boleh berhenti atau meneruskan.",
      "قلى — lebih baik berhenti.",
      "صلى — lebih baik meneruskan."
    ],

    example:
      "الْعَالَمِينَ ۝"
  }

};


function bindLessons() {

  $$(".lesson-card").forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const key =
          card.dataset.lesson;

        openLesson(key);

      }
    );

  });
}


function openLesson(key) {

  const lesson =
    lessons[key];

  if (!lesson) return;

  $("#lessonContent").innerHTML = `

    <div class="lesson-detail">

      <span class="section-kicker">
        BELAJAR TAJWID
      </span>

      <h2>
        ${lesson.title}
      </h2>

      <p>
        ${lesson.description}
      </p>

      <div class="example-arabic">
        ${lesson.example}
      </div>

      ${lesson.rules.map(rule => `

        <div class="rule-box">
          ✓ ${rule}
        </div>

      `).join("")}

      <button
        class="adhan-test"
        id="lessonPlay"
        style="margin-top:16px"
      >
        🔊 Dengarkan contoh
      </button>

    </div>
  `;

  $("#lessonModal")
    .classList.add("show");

  $("#lessonPlay")
    .addEventListener(
      "click",
      () => speakArabic(
        lesson.example
      )
    );
}


/* =========================================================
   SIMPLE ARABIC TTS
   =========================================================

   Ini hanya alat bantu pembelajaran.
   Jangan menganggap browser TTS sebagai pengganti
   rekaman qari untuk tajwid.
   ========================================================= */

function speakArabic(text) {

  if (!("speechSynthesis" in window)) {

    toast(
      "Browser tidak mendukung suara TTS"
    );

    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "ar-SA";
  utterance.rate = .72;
  utterance.pitch = 1;

  speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   BOOKMARKS
   ========================================================= */

function saveBookmark(ayah) {

  const exists =
    state.bookmarks.some(
      item => item.number === ayah.number
    );

  if (exists) {

    state.bookmarks =
      state.bookmarks.filter(
        item => item.number !== ayah.number
      );

    toast("Dihapus dari tersimpan");

  } else {

    state.bookmarks.push({
      number: ayah.number,
      surah: state.currentSurah.arabic.englishName,
      ayah: ayah.numberInSurah,
      text: ayah.text
    });

    toast("Ayat disimpan 🔖");
  }

  localStorage.setItem(
    "nurq_bookmarks",
    JSON.stringify(state.bookmarks)
  );

  renderBookmarks();
}


function renderBookmarks() {

  const container =
    $("#bookmarkList");

  if (!container) return;

  if (!state.bookmarks.length) {

    container.innerHTML = `
      <div class="bookmark-empty">
        <div style="font-size:40px">🔖</div>
        <p>Belum ada ayat tersimpan.</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.bookmarks.map(item => `

      <article class="ayah">

        <div class="ayah-head">

          <span class="ayah-number">
            ${escapeHTML(item.surah)}
            • ${item.ayah}
          </span>

          <button
            class="ayah-play"
            data-bookmark-play="${item.number}"
          >
            ▶
          </button>

        </div>

        <div class="ayah-arabic">
          ${escapeHTML(item.text)}
        </div>

      </article>

    `).join("");

  $$("[data-bookmark-play]").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        audio.src =
          getAudioURL(
            Number(
              button.dataset.bookmarkPlay
            )
          );

        audio.play();
      }
    );

  });
}


/* =========================================================
   SETTINGS
   ========================================================= */

function bindSettings() {

  $("#settingsBtn").addEventListener(
    "click",
    () => {
      $("#settingsModal")
        .classList.add("show");
    }
  );

  $("#animationToggle")
    .addEventListener(
      "change",
      e => {

        state.settings.animation =
          e.target.checked;

        saveSettings();
      }
    );

  $("#autoNextToggle")
    .addEventListener(
      "change",
      e => {

        state.settings.autoNext =
          e.target.checked;

        saveSettings();
      }
    );

  $("#fontPlus")
    .addEventListener(
      "click",
      () => {

        state.settings.fontSize =
          Math.min(
            50,
            state.settings.fontSize + 2
          );

        updateFont();
      }
    );

  $("#fontMinus")
    .addEventListener(
      "click",
      () => {

        state.settings.fontSize =
          Math.max(
            20,
            state.settings.fontSize - 2
          );

        updateFont();
      }
    );

  $$(".modal [data-close]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          button.closest(".modal")
            .classList.remove("show");

        }
      );

    });

  $$(".modal").forEach(modal => {

    modal.addEventListener(
      "click",
      e => {

        if (e.target === modal) {

          modal.classList.remove(
            "show"
          );
        }

      }
    );

  });
}


function updateFont() {

  document.documentElement.style
    .setProperty(
      "--arabic-size",
      `${state.settings.fontSize}px`
    );

  $("#fontValue").textContent =
    state.settings.fontSize;

  saveSettings();
}


function loadSettings() {

  const saved =
    JSON.parse(
      localStorage.getItem(
        "nurq_settings"
      ) || "null"
    );

  if (saved) {

    state.settings = {
      ...state.settings,
      ...saved
    };
  }

  $("#animationToggle").checked =
    state.settings.animation;

  $("#autoNextToggle").checked =
    state.settings.autoNext;

  $("#adhanToggle").checked =
    state.settings.adhan;

  updateFont();
}


function saveSettings() {

  localStorage.setItem(
    "nurq_settings",
    JSON.stringify(
      state.settings
    )
  );
}


/* =========================================================
   GLOBAL BUTTONS
   ========================================================= */

function bindGlobalButtons() {

  $("#refreshPrayer")
    .addEventListener(
      "click",
      () => loadPrayerTimes()
    );

  $("#locationBtn")
    .addEventListener(
      "click",
      () => {

        if (!navigator.geolocation) {

          toast(
            "GPS tidak tersedia"
          );

          return;
        }

        toast(
          "Meminta lokasi..."
        );

        navigator.geolocation.getCurrentPosition(
          async position => {

            state.coordinates = {
              lat:
                position.coords.latitude,
              lon:
                position.coords.longitude
            };

            $("#locationText")
              .textContent =
              "Lokasi perangkat";

            await fetchPrayerTimes(
              position.coords.latitude,
              position.coords.longitude
            );

            toast(
              "Lokasi diperbarui"
            );
          },
          () => {
            toast(
              "Izin lokasi ditolak"
            );
          }
        );

      }
    );

  $("#searchSurahBtn")
    .addEventListener(
      "click",
      () => {

        const box =
          $("#surahSearchBox");

        box.scrollIntoView({
          behavior: "smooth"
        });

        $("#surahSearch").focus();
      }
    );

  $("#continueBtn")
    .addEventListener(
      "click",
      () => {

        const last =
          Number(
            localStorage.getItem(
              "nurq_last_surah"
            ) || 1
          );

        openSurah(last);
      }
    );

  $$("[data-demo-audio]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          audio.src =
            getAudioURL(94);

          audio.play();

        }
      );

    });

  $$("[data-bookmark]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          if (!state.currentSurah) {

            toast(
              "Buka surah terlebih dahulu"
            );

            return;
          }

          saveBookmark(
            state.currentSurah.arabic.ayahs[0]
          );

        }
      );

    });
}


/* =========================================================
   UTILITIES
   ========================================================= */

function toast(message) {

  const el =
    $("#toast");

  el.textContent =
    message;

  el.classList.add("show");

  clearTimeout(
    toast.timer
  );

  toast.timer =
    setTimeout(() => {

      el.classList.remove("show");

    }, 2500);
}


function stripHTML(html) {

  const div =
    document.createElement("div");

  div.innerHTML =
    html || "";

  return div.textContent || "";
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}