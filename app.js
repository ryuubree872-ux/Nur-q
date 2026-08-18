/* =========================================================
   NURQ V2
   Quran Reader + Latin + Translation + Auto Recitation
   ========================================================= */

const QURAN_API = "https://api.alquran.cloud/v1";

const AUDIO_BASE =
  "https://cdn.islamic.network/quran/audio/128/ar.alafasy";

const state = {
  surahs: [],
  current: null,
  currentIndex: 0,
  playing: false,
  autoNext: true,
  bookmarks: JSON.parse(
    localStorage.getItem("nurq_bookmarks") || "[]"
  ),
  fontSize: Number(
    localStorage.getItem("nurq_font_size") || 30
  )
};

const audio =
  document.getElementById("audioPlayer");

const $ = s =>
  document.querySelector(s);

const $$ = s =>
  [...document.querySelectorAll(s)];


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    initNavigation();
    initSettings();
    initSearch();
    initModals();
    initPrayer();

    applyFont();

    await loadSurahs();

    loadPrayerTimes();

    renderBookmarks();

    console.log(
      "NurQ V2 berhasil dimulai"
    );
  }
);


/* =========================================================
   SAFE FETCH
   ========================================================= */

async function api(url) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      15000
    );

  try {

    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const json =
      await response.json();

    if (!json || json.code !== 200) {
      throw new Error(
        json?.status ||
        "API error"
      );
    }

    return json.data;

  } finally {

    clearTimeout(timeout);
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
        <div style="font-size:32px">
          ⏳
        </div>
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
      "SURAH ERROR:",
      error
    );

    if (list) {

      list.innerHTML = `
        <div class="bookmark-empty">

          <div style="font-size:35px">
            ⚠️
          </div>

          <p>
            Gagal memuat daftar surah.
          </p>

          <button
            id="retrySurah"
            class="adhan-test"
          >
            Coba lagi
          </button>

        </div>
      `;

      $("#retrySurah")
        ?.addEventListener(
          "click",
          loadSurahs
        );
    }

    toast(
      "Internet/API tidak dapat diakses"
    );
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

  const data =
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

  if (!data.length) {

    list.innerHTML = `
      <div class="bookmark-empty">
        Surah tidak ditemukan.
      </div>
    `;

    return;
  }

  list.innerHTML =
    data.map(
      s => `

      <button
        class="surah-card"
        data-open-surah="${s.number}"
      >

        <div class="surah-number">
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
          ${escapeHTML(s.name)}
        </div>

      </button>
    `
    ).join("");

  $$("[data-open-surah]")
    .forEach(btn => {

      btn.onclick = () => {

        openSurah(
          Number(
            btn.dataset.openSurah
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
      <div style="font-size:32px">
        📖
      </div>

      <p>
        Memuat bacaan...
      </p>
    </div>
  `;

  try {

    /*
      IMPORTANT:
      Jangan meminta tiga edition sekaligus.
      Ambil masing-masing secara terpisah.
    */

    const arabicPromise =
      api(
        `${QURAN_API}/surah/${number}/quran-uthmani`
      );

    const latinPromise =
      api(
        `${QURAN_API}/surah/${number}/en.transliteration`
      ).catch(
        () => null
      );

    const indoPromise =
      api(
        `${QURAN_API}/surah/${number}/id.indonesian`
      ).catch(
        () => null
      );

    const [
      arabic,
      latin,
      indo
    ] =
      await Promise.all([
        arabicPromise,
        latinPromise,
        indoPromise
      ]);

    state.current = {
      arabic,
      latin,
      indo
    };

    state.currentIndex = 0;

    renderReader();

    localStorage.setItem(
      "nurq_last_surah",
      number
    );

  } catch (error) {

    console.error(
      "OPEN SURAH ERROR:",
      error
    );

    $("#ayahList").innerHTML = `
      <div class="bookmark-empty">

        <div style="font-size:40px">
          ⚠️
        </div>

        <p>
          Bacaan surah gagal dimuat.
        </p>

        <button
          class="adhan-test"
          id="retryCurrentSurah"
        >
          Muat ulang
        </button>

      </div>
    `;

    $("#retryCurrentSurah")
      ?.addEventListener(
        "click",
        () => openSurah(number)
      );

    toast(
      "Gagal memuat bacaan"
    );
  }
}


/* =========================================================
   RENDER READER
   ========================================================= */

function renderReader() {

  const {
    arabic,
    latin,
    indo
  } = state.current;

  $("#readerTitle").textContent =
    arabic.englishName;

  $("#readerArabicName").textContent =
    arabic.name;

  $("#readerTranslation").textContent =
    arabic.englishNameTranslation;

  $("#readerInfo").textContent =
    `${arabic.revelationType} • ` +
    `${arabic.numberOfAyahs} ayat`;

  $("#ayahList").innerHTML =
    arabic.ayahs.map(
      (ayah, index) => {

        const latinText =
          latin?.ayahs?.[index]?.text ||
          "Latin tidak tersedia";

        const indoText =
          indo?.ayahs?.[index]?.text ||
          "Terjemahan tidak tersedia";

        return `

          <article
            class="ayah"
            id="ayah-${index}"
            data-ayah-index="${index}"
          >

            <div class="ayah-head">

              <span class="ayah-number">
                ۞
                ${ayah.numberInSurah}
              </span>

              <button
                class="ayah-play"
                data-play-ayah="${index}"
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
                stripHTML(indoText)
              )}

            </div>

            <div
              style="
                display:flex;
                gap:8px;
                margin-top:12px;
              "
            >

              <button
                class="round-btn"
                data-play-ayah="${index}"
              >
                🔊
              </button>

              <button
                class="round-btn"
                data-save-ayah="${index}"
              >
                🔖
              </button>

            </div>

          </article>

        `;
      }
    ).join("");

  $$("[data-play-ayah]")
    .forEach(btn => {

      btn.onclick = e => {

        e.stopPropagation();

        playAyah(
          Number(
            btn.dataset.playAyah
          )
        );
      };

    });

  $$("[data-save-ayah]")
    .forEach(btn => {

      btn.onclick = e => {

        e.stopPropagation();

        saveCurrentAyah(
          Number(
            btn.dataset.saveAyah
          )
        );

      };

    });

  $$(".ayah").forEach(card => {

    card.onclick = () => {

      playAyah(
        Number(
          card.dataset.ayahIndex
        )
      );

    };

  });
}


/* =========================================================
   AUDIO
   ========================================================= */

function audioURL(
  globalAyahNumber
) {

  return (
    `${AUDIO_BASE}/` +
    `${globalAyahNumber}.mp3`
  );
}


async function playAyah(
  index
) {

  if (!state.current) {

    toast(
      "Buka surah terlebih dahulu"
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

  state.playing = true;

  highlightAyah(index);

  const url =
    audioURL(
      ayah.number
    );

  console.log(
    "Playing:",
    url
  );

  audio.pause();

  audio.currentTime = 0;

  audio.src = url;

  try {

    await audio.play();

    animateAyah(index);

  } catch (error) {

    console.error(
      "AUDIO PLAY ERROR:",
      error
    );

    toast(
      "Tekan tombol Play untuk mengaktifkan audio"
    );
  }
}


/* =========================================================
   AUTO PLAY NEXT
   ========================================================= */

audio.addEventListener(
  "ended",
  () => {

    if (!state.current) {
      return;
    }

    const total =
      state.current
        .arabic
        .ayahs
        .length;

    if (
      state.autoNext &&
      state.currentIndex <
        total - 1
    ) {

      const next =
        state.currentIndex + 1;

      setTimeout(
        () => {
          playAyah(next);
        },
        250
      );

    } else {

      state.playing = false;

      $$(".ayah")
        .forEach(
          el =>
            el.classList.remove(
              "playing"
            )
        );

      toast(
        "Surah selesai dibaca"
      );
    }
  }
);


/* =========================================================
   PLAY WHOLE SURAH
   ========================================================= */

function playWholeSurah() {

  if (!state.current) {

    toast(
      "Pilih surah terlebih dahulu"
    );

    return;
  }

  /*
    Ini adalah interaksi pengguna.
    Setelah audio pertama berhasil,
    event "ended" akan meneruskan
    ke ayat berikutnya secara otomatis.
  */

  state.autoNext = true;

  playAyah(0);

  toast(
    "Bacaan otomatis dimulai"
  );
}


/* =========================================================
   PAUSE
   ========================================================= */

function pauseAudio() {

  audio.pause();

  state.playing = false;

  toast(
    "Bacaan dijeda"
  );
}


/* =========================================================
   STOP
   ========================================================= */

function stopAudio() {

  audio.pause();

  audio.currentTime = 0;

  state.playing = false;

  $$(".ayah")
    .forEach(
      el =>
        el.classList.remove(
          "playing"
        )
    );

  toast(
    "Bacaan dihentikan"
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
      el =>
        el.classList.remove(
          "playing"
        )
    );

  const card =
    $(`#ayah-${index}`);

  if (!card) return;

  card.classList.add(
    "playing"
  );

  card.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


function animateAyah(
  index
) {

  const card =
    $(`#ayah-${index}`);

  if (!card) return;

  card.animate(
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
   BUTTONS READER
   ========================================================= */

$("#playSurah")
  ?.addEventListener(
    "click",
    playWholeSurah
  );

$("#pauseSurah")
  ?.addEventListener(
    "click",
    pauseAudio
  );

$("#stopSurah")
  ?.addEventListener(
    "click",
    stopAudio
  );


/* =========================================================
   NAVIGATION
   ========================================================= */

function initNavigation() {

  $$("[data-page]")
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () => {

          showPage(
            btn.dataset.page
          );

        }
      );

    });

  $("#readerBack")
    ?.addEventListener(
      "click",
      () => showPage("quran")
    );

  $("#continueBtn")
    ?.addEventListener(
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
}


function showPage(page) {

  $$(".page")
    .forEach(
      p =>
        p.classList.remove(
          "active"
        )
    );

  const target =
    $(`#${page}Page`);

  if (target) {

    target.classList.add(
      "active"
    );
  }

  $$(".nav-item")
    .forEach(btn => {

      btn.classList.toggle(
        "active",
        btn.dataset.page === page
      );

    });

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
      e => {

        renderSurahs(
          e.target.value
        );

      }
    );

  $("#searchSurahBtn")
    ?.addEventListener(
      "click",
      () => {

        const box =
          $("#surahSearchBox");

        box.scrollIntoView({
          behavior: "smooth"
        });

        setTimeout(
          () => {
            $("#surahSearch")
              ?.focus();
          },
          300
        );

      }
    );
}


/* =========================================================
   BOOKMARK
   ========================================================= */

function saveCurrentAyah(
  index
) {

  if (!state.current) return;

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
      "Ayat dihapus dari tersimpan"
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
      "Ayat berhasil disimpan 🔖"
    );
  }

  localStorage.setItem(
    "nurq_bookmarks",
    JSON.stringify(
      state.bookmarks
    )
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

        <div
          style="
            font-size:45px;
            margin-bottom:10px;
          "
        >
          🔖
        </div>

        <p>
          Belum ada ayat tersimpan.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    state.bookmarks.map(
      item => `

      <article class="ayah">

        <div class="ayah-head">

          <span class="ayah-number">
            ${escapeHTML(item.surah)}
            •
            ${item.ayah}
          </span>

          <button
            class="ayah-play"
            data-bookmark-audio="${item.globalNumber}"
          >
            ▶
          </button>

        </div>

        <div class="ayah-arabic">
          ${escapeHTML(item.text)}
        </div>

      </article>
    `
    ).join("");

  $$("[data-bookmark-audio]")
    .forEach(btn => {

      btn.onclick = async () => {

        audio.pause();

        audio.src =
          audioURL(
            Number(
              btn.dataset.bookmarkAudio
            )
          );

        try {

          await audio.play();

        } catch {

          toast(
            "Tekan tombol lagi untuk memutar"
          );
        }

      };

    });
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
          ?.classList.add("show");

      }
    );

  $("#animationToggle")
    ?.addEventListener(
      "change",
      e => {

        localStorage.setItem(
          "nurq_animation",
          e.target.checked
        );
      }
    );

  $("#autoNextToggle")
    ?.addEventListener(
      "change",
      e => {

        state.autoNext =
          e.target.checked;

        localStorage.setItem(
          "nurq_auto_next",
          e.target.checked
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
   MODAL
   ========================================================= */

function initModals() {

  $$("[data-close]")
    .forEach(btn => {

      btn.onclick = () => {

        btn.closest(".modal")
          ?.classList.remove(
            "show"
          );
      };

    });

  $$(".modal")
    .forEach(modal => {

      modal.addEventListener(
        "click",
        e => {

          if (
            e.target === modal
          ) {

            modal.classList.remove(
              "show"
            );
          }

        }
      );

    });
}


/* =========================================================
   PRAYER
   ========================================================= */

async function initPrayer() {

  $("#refreshPrayer")
    ?.addEventListener(
      "click",
      loadPrayerTimes
    );

  $("#locationBtn")
    ?.addEventListener(
      "click",
      requestLocation
    );
}


async function loadPrayerTimes() {

  if (!navigator.geolocation) {

    await prayerFromCoordinates(
      -6.2,
      106.816666,
      "Jakarta, Indonesia"
    );

    return;
  }

  navigator.geolocation
    .getCurrentPosition(
      async position => {

        await prayerFromCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "Lokasi perangkat"
        );

      },

      async () => {

        await prayerFromCoordinates(
          -6.2,
          106.816666,
          "Jakarta, Indonesia"
        );

      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
}


function requestLocation() {

  if (!navigator.geolocation) {

    toast(
      "GPS tidak tersedia"
    );

    return;
  }

  navigator.geolocation
    .getCurrentPosition(
      async position => {

        await prayerFromCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "Lokasi perangkat"
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


async function prayerFromCoordinates(
  lat,
  lon,
  locationName
) {

  try {

    const now =
      new Date();

    const dd =
      String(
        now.getDate()
      ).padStart(2,"0");

    const mm =
      String(
        now.getMonth() + 1
      ).padStart(2,"0");

    const yyyy =
      now.getFullYear();

    const url =
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}` +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&method=20`;

    const response =
      await fetch(url);

    const json =
      await response.json();

    if (
      !json.data ||
      !json.data.timings
    ) {

      throw new Error(
        "Prayer API error"
      );
    }

    window.prayerData =
      json.data.timings;

    $("#locationText")
      && (
        $("#locationText")
          .textContent =
          locationName
      );

    renderPrayer(
      json.data.timings
    );

    updateNextPrayer();

  } catch (error) {

    console.error(
      error
    );

    toast(
      "Gagal memuat jadwal sholat"
    );
  }
}


function renderPrayer(
  timings
) {

  const map = {
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
    Object.entries(map)
      .map(
        ([key,name]) => `

        <div
          class="prayer-row"
          data-prayer="${key}"
        >

          <span class="symbol">
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


function updateNextPrayer() {

  const timings =
    window.prayerData;

  if (!timings) return;

  const prayers = [
    ["Fajr","Subuh"],
    ["Dhuhr","Dzuhur"],
    ["Asr","Ashar"],
    ["Maghrib","Maghrib"],
    ["Isha","Isya"]
  ];

  const now =
    new Date();

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  let next = null;

  for (
    const [key,name]
    of prayers
  ) {

    const [h,m] =
      timings[key]
        .split(":")
        .map(Number);

    const value =
      h * 60 + m;

    if (value > current) {

      next = {
        key,
        name,
        time: timings[key],
        value
      };

      break;
    }
  }

  if (!next) {

    next = {
      key: "Fajr",
      name: "Subuh",
      time: timings.Fajr
    };
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
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function toast(
  message
) {

  const element =
    $("#toast");

  if (!element) return;

  element.textContent =
    message;

  element.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {

        element.classList.remove(
          "show"
        );

      },
      2500
    );
}


/* =========================================================
   UTILITIES
   ========================================================= */

function stripHTML(
  html
) {

  const temp =
    document.createElement(
      "div"
    );

  temp.innerHTML =
    html || "";

  return temp.textContent ||
    "";
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
