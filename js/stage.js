document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId");
  const dayIdFromUrl = urlParams.get("dayId");
  let layoutOrientation = "vertical"; // "vertical" | "horizontal"

  if (!eventId) {
    console.error("Nije proslijeđen eventId!");
    return;
  }

  const db = firebase.firestore();
  const navContainer = document.querySelector(".event-days-options-info ul");
  const eventTitle = document.querySelector(".event-title");
  const layoutContainer = document.querySelector(".event-layout");

  let selectedSeats = [];
  let currentDayId = null;
  let currentLayout = null;
  let layoutsData = {}; // pohrana svih layout dokumenata za trenutni dan

  // -----------------------------
  // Dohvat svih dana
  // -----------------------------
  db.collection("events")
    .doc(eventId)
    .collection("eventDays")
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        console.log("Nema dana za ovaj event");
        return;
      }

      const daysData = [];
      snapshot.forEach((doc) => {
        const day = doc.data();
        day.id = doc.id;
        day.dateObj = day.date?.toDate ? day.date.toDate() : new Date(day.date);
        daysData.push(day);
      });

      daysData.sort((a, b) => a.dateObj - b.dateObj);

      // Generiranje tabova dana
      daysData.forEach((day) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.textContent = `${day.dayName} | ${day.time}`;
        a.dataset.dayId = day.id;
        li.appendChild(a);
        navContainer.appendChild(li);
      });

      navContainer.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          e.preventDefault();
          showDay(e.target.dataset.dayId);
        }
      });

      showDay(dayIdFromUrl || daysData[0].id);
    })
    .catch((err) => console.error("Greška prilikom dohvaćanja dana:", err));

  // -----------------------------
  // Funkcija za prikaz dana
  // -----------------------------
  function showDay(dayId) {
    currentDayId = dayId;
    selectedSeats = [];
    currentLayout = null;
    layoutsData = {};
    layoutContainer.innerHTML = "";

    const dayRef = db
      .collection("events")
      .doc(eventId)
      .collection("eventDays")
      .doc(dayId);

    dayRef
      .get()
      .then((dayDoc) => {
        if (!dayDoc.exists) return console.error("Dan ne postoji!");

        const day = dayDoc.data();
        const dateObj = day.date?.toDate
          ? day.date.toDate()
          : new Date(day.date);
        eventTitle.textContent = `${
          day.description
        } - ${dateObj.toLocaleDateString()}`;

        // Stage
        const stageImg = document.querySelector(".stage-overview img");
        if (stageImg) stageImg.src = day.stageOverview || "";

        // Lijeva zona
        if (day.stands?.left?.length) {
          const leftAside = document.createElement("aside");
          leftAside.classList.add("left-aside");
          day.stands.left.forEach((stand) => {
            const standDiv = document.createElement("div");
            standDiv.classList.add("stand");
            standDiv.innerHTML = `<img src="${stand.image}" alt="${stand.name}"><p>${stand.name}</p>`;
            leftAside.appendChild(standDiv);
          });
          layoutContainer.appendChild(leftAside);
        }

        // Centralna zona
        const centerDiv = document.createElement("div");
        centerDiv.classList.add("center-content");
        layoutContainer.appendChild(centerDiv);

        // -----------------------------
        // Dohvati sve layout dokumente za dan
        // -----------------------------
        db.collection("events")
          .doc(eventId)
          .collection("eventDays")
          .doc(dayId)
          .collection("layout")
          .get()
          .then((layoutSnapshot) => {
            if (layoutSnapshot.empty) {
              centerDiv.textContent = "Nema dostupnih sjedala";
              return;
            }

            // Spremi layout dokumente
            layoutSnapshot.forEach((layoutDoc) => {
              layoutsData[layoutDoc.id] = layoutDoc.data().sections || {};
            });

            // Generiraj tabove za layout
            createLayoutTabs(centerDiv);
          })
          .catch((err) =>
            console.error("Greška prilikom dohvaćanja layouta:", err)
          );

        // Desna zona
        if (day.stands?.right?.length) {
          const rightAside = document.createElement("aside");
          rightAside.classList.add("right-aside");
          day.stands.right.forEach((stand) => {
            const standDiv = document.createElement("div");
            standDiv.classList.add("stand");
            standDiv.innerHTML = `<img src="${stand.image}" alt="${stand.name}"><p>${stand.name}</p>`;
            rightAside.appendChild(standDiv);
          });
          layoutContainer.appendChild(rightAside);
        }

        // Aktivni tab dana
        document.querySelectorAll(".event-days-options-info a").forEach((a) => {
          a.classList.toggle("active", a.dataset.dayId === dayId);
        });

        addCheckoutButton();
      })
      .catch((err) => console.error("Greška prilikom dohvaćanja dana:", err));
  }

  // -----------------------------
  // Kreiranje tabova layouta
  // -----------------------------
  function createLayoutTabs(centerDiv) {
    const tabContainer = document.createElement("div");
    tabContainer.classList.add("layout-tabs");

    Object.keys(layoutsData).forEach((layoutId, index) => {
      const tabBtn = document.createElement("button");
      tabBtn.textContent = layoutId.toUpperCase();
      tabBtn.dataset.layoutId = layoutId;
      if (index === 0) currentLayout = layoutId; // default prvi tab
      tabBtn.classList.toggle("active", index === 0);

      tabBtn.addEventListener("click", () => {
        currentLayout = layoutId;
        document
          .querySelectorAll(".layout-tabs button")
          .forEach((b) => b.classList.toggle("active", b === tabBtn));
        renderSeats(centerDiv);
      });

      tabContainer.appendChild(tabBtn);
    });

    centerDiv.appendChild(tabContainer);

    renderSeats(centerDiv);
  }

  // -----------------------------
  // Render sjedala za odabrani layout
  // -----------------------------
  function renderSeats(centerDiv) {
    const old = centerDiv.querySelector(".seat-layout");
    if (old) old.remove();

    const oldMiniMap = centerDiv.querySelector(".mini-map");
    if (oldMiniMap) oldMiniMap.remove();

    if (!currentLayout || !layoutsData[currentLayout]) {
      centerDiv.textContent = "Nema dostupnih sjedala";
      return;
    }

    // ⬇️ layoutData = SEKCIJE + REDOVI + SJEDALA
    const layoutData = generateSeats({ price: 0 }, layoutsData[currentLayout]);

    // ✅ MINI MAPA (koristi layoutData kao sections)
    renderMiniMap(centerDiv, layoutData);

    const seatLayout = document.createElement("div");
    seatLayout.classList.add(
      "seat-layout",
      layoutOrientation === "horizontal" ? "horizontal" : "vertical"
    );

    Object.entries(layoutData).forEach(([sectionKey, section]) => {
      const sectionDiv = document.createElement("div");

      // ✅ OVO JE KLJUČNO ZA MINI MAP
      sectionDiv.classList.add("seat-section");
      sectionDiv.dataset.section = sectionKey;

      section.rows.forEach((row, rowIndex) => {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("seat-row");

        /* 🔤 Oznaka reda (A, B, C…) */
        const rowLabel = document.createElement("div");
        rowLabel.classList.add("row-label");
        rowLabel.textContent = String.fromCharCode(65 + rowIndex);
        rowDiv.appendChild(rowLabel);

        row.seats.forEach((seat) => {
          const seatDiv = document.createElement("div");
          seatDiv.classList.add("seat", "available", section.cssClass);

          seatDiv.dataset.seatId = seat.id;
          seatDiv.dataset.price = seat.price;

          seatDiv.addEventListener("click", () => {
            if (seatDiv.classList.contains("selected")) {
              seatDiv.classList.remove("selected");
              selectedSeats = selectedSeats.filter((s) => s !== seat.id);
            } else {
              seatDiv.classList.add("selected");
              selectedSeats.push(seat.id);
            }
            updateCheckoutButton();
          });

          rowDiv.appendChild(seatDiv);
        });

        sectionDiv.appendChild(rowDiv);
      });

      seatLayout.appendChild(sectionDiv);
    });

    centerDiv.appendChild(seatLayout);
  }
  // -----------------------------
  // Checkout gumb
  // -----------------------------
  function addCheckoutButton() {
    let existingBtn = document.querySelector(".checkout-btn");
    if (existingBtn) existingBtn.remove();

    const btn = document.createElement("button");
    btn.className = "checkout-btn";
    btn.textContent = `Nastavi na kupnju (${selectedSeats.length} sjedala)`;
    btn.disabled = selectedSeats.length === 0;

    layoutContainer.appendChild(btn);

    btn.addEventListener("click", () => {
      if (!currentDayId) return;
      alert("Funkcija je u izradi.");
      const checkoutUrl = `checkout.html?eventId=${eventId}&dayId=${currentDayId}&seats=${selectedSeats.join(
        ","
      )}`;
      // window.location.href = checkoutUrl;
    });
  }

  function updateCheckoutButton() {
    const btn = document.querySelector(".checkout-btn");
    if (btn) {
      btn.textContent = `Nastavi na kupnju (${selectedSeats.length} sjedala)`;
      btn.disabled = selectedSeats.length === 0;
    }
  }

  // unutar generateSeats funkcije
  function generateSeats(day, sections) {
    if (!sections) return {};

    const layout = {};
    const basePrice = day.price || day.lowestPrice || 0;

    const sectionColors = [
      "section-A",
      "section-B",
      "section-C",
      "section-D",
      "section-E"
    ];

    // 🔹 SORTIRANJE SEKCIJA PO ABECEDI
    const sortedSections = Object.entries(sections).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB)
    );

    sortedSections.forEach(([sectionKey, section], index) => {
      const cssClass = sectionColors[index % sectionColors.length];

      layout[sectionKey] = {
        cssClass,
        rows: [],
        seatsPerRow: section.seatsPerRow
      };

      // 🔹 GENERIRANJE REDOVA
      for (let row = 1; row <= section.rows; row++) {
        const rowLabel = String.fromCharCode(64 + row); // 1 → 'A', 2 → 'B', ...

        const rowSeats = [];

        // 🔹 GENERIRANJE SJEDALA UNUTAR REDA
        for (let seatNum = 1; seatNum <= section.seatsPerRow; seatNum++) {
          rowSeats.push({
            id: `${sectionKey}-${rowLabel}-${seatNum}`,
            label: seatNum,
            section: sectionKey,
            row: rowLabel,
            price: basePrice * (section.priceMultiplier || 1)
          });
        }

        // 🔹 SORTIRANJE SJEDALA PO BROJU (iako su već po redu)
        rowSeats.sort((a, b) => a.label - b.label);

        layout[sectionKey].rows.push({
          rowNumber: row,
          label: rowLabel,
          seats: rowSeats
        });
      }

      // 🔹 SORTIRANJE REDOVA PO ABECEDI
      layout[sectionKey].rows.sort((a, b) => a.label.localeCompare(b.label));
    });

    return layout;
  }

  function renderMiniMap(centerDiv, sections) {
    // ukloni staru mini mapu
    const existing = centerDiv.querySelector(".mini-map");
    if (existing) existing.remove();

    const miniMap = document.createElement("div");
    miniMap.classList.add("mini-map", layoutOrientation);

    // STAGE
    const stage = document.createElement("div");
    stage.classList.add("mini-stage");
    stage.textContent = "STAGE";
    miniMap.appendChild(stage);

    const sectionsWrap = document.createElement("div");
    sectionsWrap.classList.add("mini-sections");

    Object.entries(sections).forEach(([key, section], index) => {
      const block = document.createElement("div");
      block.classList.add("mini-section", `section-${index + 1}`);
      block.dataset.section = key;

      // veličina proporcionalna broju sjedala
      const size = section.rows * section.seatsPerRow;
      block.style.flex = Math.max(1, size / 10);

      block.innerHTML = `
      <span>${key}</span>
      <small>${section.rows.length} × ${section.seatsPerRow}</small>
    `;

      // klik = scroll do sekcije
      block.addEventListener("click", () => {
        const target = document.querySelector(
          `.seat-section[data-section="${key}"]`
        );
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("highlight");
          setTimeout(() => target.classList.remove("highlight"), 800);
        }
      });

      sectionsWrap.appendChild(block);
    });

    miniMap.appendChild(sectionsWrap);

    centerDiv.prepend(miniMap);
  }
});
