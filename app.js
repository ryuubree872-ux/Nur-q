/* =========================================================
   NURQ V3
   AYAT AUDIO + TIMEZONE + ADHAN + 3D INTERACTION
   ========================================================= */

const QURAN_API = "https://api.alquran.cloud/v1";

const AUDIO_BASE =
  "https://cdn.islamic.network/quran/audio/128/ar.alafasy";

const ADHAN_URL =
  "https://cdn.islamic.network/adhan/adhan.mp3";

const TIMEZONE_CONFIG = {
  WIB: {
    label: "WIB",
    name: "Waktu Indonesia Barat",
    offset: 7
  },

  WITA: {
    label: "WITA",
    name: "Waktu Indonesia Tengah",
    offset: 8
  },

  WIT: {
    label: "WIT",
    name: "Waktu Indonesia Timur",
    offset: 9
  }
};

const state = {
  surahs: [],
  current: null,
  currentIndex: 0,

  playing: false,
  autoNext: true,

  adhanEnabled: false,
  lastAdhanKey: "",

  timezone:
    localStorage.getItem("nurq_timezone") ||
    null,

  bookmarks: JSON.parse(
    localStorage.getItem(
      "nurq_bookmarks"
    ) || "[]"
  ),

  fontSize: Number(
    localStorage.getItem(
      "nurq_font_size"
    ) || 30
  )
};

const audio =
  document.getElementById(
    "audioPlayer"
  );

const $ =
  selector =>
    document.querySelector(
      selector
    );

const $$ =
  selector =>
    [...document.querySelectorAll(
      selector
    )];


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    initNavigation();
    initSearch();
    initSettings();
    initModals();
    initPrayer();
    initAyahButtons();
    initDailyVerse();

    applyFont();

    /*
      First entry timezone selector
    */
    if (!state.timezone) {
      showTimezoneSelector();
    }

    await loadSurahs();

    await loadPrayerTimes();

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
