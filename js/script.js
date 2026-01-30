document.addEventListener("DOMContentLoaded", function () {
  const eventsContainer = document.getElementById("eventsContainer");
  const db = firebase.firestore();

  // DROPDOWN
  const dropdownBtn = document.getElementById("dropdownBtn");
  const dropdownOptions = document.getElementById("dropdownOptions");
  const multiSelectDropdown = document.getElementsByClassName(
    "multi-select-dropdown"
  )[0];

  console.log(multiSelectDropdown);
  // Apply filter button
  const applyFilterBtn = document.createElement("button");
  applyFilterBtn.id = "applyFilter";
  applyFilterBtn.className = "apply-btn";
  applyFilterBtn.textContent = "Primijeni filter";

  let selectAllCheckbox;

  // BADGES
  const badgesContainer = document.getElementById("selectedBadges");

  // ======================
  // DATE RANGE
  // ======================
  const dateWrapper = document.getElementById("date-container");

  const dateFromInput = document.getElementById("dateFrom");
  const dateToInput = document.getElementById("dateTo");

  console.log(dateFromInput);
  console.log(dateToInput);

  dateFromInput.addEventListener("change", applyFiltersAndRender);
  dateToInput.addEventListener("change", applyFiltersAndRender);

  // SEARCH & SORT
  const searchInput = document.getElementById("searchInput");

  const sortContainer = document.getElementById("sort-container");

  const sortSelect = document.createElement("select");
  sortSelect.id = "sortSelect";
  sortSelect.innerHTML = `
    <option value="date-desc">Datum ↓</option>
    <option value="date-asc">Datum ↑</option>
    <option value="price-asc">Cijena ↑</option>
    <option value="price-desc">Cijena ↓</option>
  `;

  sortContainer.appendChild(sortSelect);
  // dateWrapper.parentElement.insertBefore(sortSelect, dateWrapper.nextSibling);

  // PAGINATION
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const pageIndicator = document.getElementById("pageIndicator");

  const pageSize = 12;
  let currentPage = 1;

  let allEvents = [];
  let filteredEvents = [];
  let selectedCities = [];

  // ======================
  // FETCH EVENTS
  // ======================
  function fetchEvents() {
    showSkeleton(pageSize);

    db.collection("events")
      .orderBy("createdAt", "desc")
      .get()
      .then((snapshot) => {
        allEvents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        hideSkeleton();
        buildCitiesDropdown();
        renderBadges();
        applyFiltersAndRender();
      });
  }

  // ======================
  // BUILD CITIES DROPDOWN
  // ======================
  function buildCitiesDropdown() {
    dropdownOptions.innerHTML = "";

    // ALL
    const allLabel = document.createElement("label");
    allLabel.innerHTML = `
      <input type="checkbox" value="ALL" checked>
      Svi gradovi
    `;
    dropdownOptions.appendChild(allLabel);
    selectAllCheckbox = allLabel.querySelector("input");

    const cities = [
      ...new Set(allEvents.map((ev) => ev.location).filter(Boolean))
    ].sort();

    cities.forEach((city) => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="checkbox" value="${city}">
        ${city}
      `;
      dropdownOptions.appendChild(label);
    });

    dropdownOptions.appendChild(applyFilterBtn);
  }

  dropdownOptions.addEventListener("change", (e) => {
    const target = e.target;
    if (target.tagName !== "INPUT") return;

    // ako je kliknut neki grad (ne ALL)
    if (target.value !== "ALL" && target.checked) {
      selectAllCheckbox.checked = false;
    }

    // ako je kliknut ALL
    if (target.value === "ALL" && target.checked) {
      dropdownOptions
        .querySelectorAll("input[type='checkbox']")
        .forEach((cb) => {
          cb.checked = cb.value === "ALL";
        });
    }
  });

  // ======================
  // APPLY FILTERS
  // ======================
  function applyFiltersAndRender() {
    //CITY FILTER
    filteredEvents =
      selectedCities.length === 0
        ? allEvents
        : allEvents.filter((ev) => selectedCities.includes(ev.location));

    //SEARCH FILTER
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filteredEvents = filteredEvents.filter(
        (ev) =>
          ev.title.toLowerCase().includes(searchTerm) ||
          ev.location?.toLowerCase().includes(searchTerm)
      );
    }

    // DATE RANGE FILTER
    const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
    const dateTo = dateToInput.value ? new Date(dateToInput.value) : null;

    filteredEvents = filteredEvents.filter((ev) => {
      if (!ev.createdAt) return true;
      const eventDate = ev.createdAt.toDate();

      if (dateFrom && eventDate < dateFrom) return false;
      if (dateTo && eventDate > dateTo) return false;

      return true;
    });

    const sortValue = sortSelect.value;
    filteredEvents.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      if (sortValue === "date-asc")
        return a.createdAt.toDate() - b.createdAt.toDate();
      if (sortValue === "date-desc")
        return b.createdAt.toDate() - a.createdAt.toDate();
      if (sortValue === "price-asc")
        return (a.lowestPrice || 0) - (b.lowestPrice || 0);
      if (sortValue === "price-desc")
        return (b.lowestPrice || 0) - (a.lowestPrice || 0);
      return 0;
    });

    currentPage = 1;
    renderPage();
  }

  // ======================
  // RENDER PAGE
  // ======================
  function renderPage() {
    eventsContainer.innerHTML = "";

    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageEvents = filteredEvents.slice(start, start + pageSize);

    if (!pageEvents.length) {
      eventsContainer.innerHTML = "<p>Nema dostupnih događaja.</p>";
      pageIndicator.textContent = "Stranica 0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    pageEvents.forEach((event) => {
      const price =
        event.lowestPrice === 0 || event.lowestPrice
          ? `${event.lowestPrice} €`
          : "Free";
      const card = document.createElement("div");
      card.innerHTML = `
        <a href="event.html?eventId=${event.id}">
          <article class="eventim-card">
            <img src="${
              event.imageUrl || "https://via.placeholder.com/400x200"
            }">
            <div class="eventim-card-content">
              <h3 class="event-title">${event.title}</h3>
              <p class="event-date">${getDateFormat(event.createdAt)}</p>
              <p class="event-location">${event.location}</p>
              <p class="event-price">${price} </p>
            </div>
          </article>
        </a>
      `;
      eventsContainer.appendChild(card);
    });

    updatePagination(totalPages);
  }

  // ======================
  // PAGINATION
  // ======================
  function updatePagination(totalPages) {
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageIndicator.textContent = `Stranica ${currentPage} / ${totalPages}`;
  }

  nextBtn.onclick = () => {
    if (currentPage < Math.ceil(filteredEvents.length / pageSize)) {
      currentPage++;
      renderPage();
    }
  };

  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  };

  // ======================
  // DROPDOWN EVENTS
  // ======================
  dropdownBtn.onclick = () => {
    dropdownOptions.style.display =
      dropdownOptions.style.display === "flex" ? "none" : "flex";
  };

  applyFilterBtn.onclick = () => {
    const checked = [...dropdownOptions.querySelectorAll("input:checked")];

    if (checked.some((cb) => cb.value === "ALL")) {
      selectedCities = [];
      dropdownOptions
        .querySelectorAll("input")
        .forEach((cb) => (cb.checked = cb.value === "ALL"));
    } else {
      selectedCities = checked.map((cb) => cb.value);
      selectAllCheckbox.checked = false;
    }

    dropdownOptions.style.display = "none";
    renderBadges();
    applyFiltersAndRender();
  };

  // ======================
  // BADGES
  // ======================
  function renderBadges() {
    badgesContainer.innerHTML = "";

    // Ako nema aktivnih filtera
    if (
      selectedCities.length === 0 &&
      !searchInput.value &&
      sortSelect.value === "date-desc"
    ) {
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "Svi gradovi";
      badgesContainer.appendChild(badge);
      return;
    }

    // Badge po gradu
    selectedCities.forEach((city) => {
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.innerHTML = `${city} <span data-city="${city}">×</span>`;
      badgesContainer.appendChild(badge);
    });

    // 🔥 JEDAN GLOBALNI RESET BADGE
    const clearAll = document.createElement("div");
    clearAll.className = "badge";
    clearAll.innerHTML = "Ukloni sve filtre <span class='clear-all'>×</span>";
    badgesContainer.appendChild(clearAll);
  }

  badgesContainer.addEventListener("click", (e) => {
    // GLOBAL RESET
    if (e.target.classList.contains("clear-all")) {
      selectedCities = [];
      searchInput.value = "";
      sortSelect.value = "date-desc";
      dateFromInput.value = "";
      dateToInput.value = "";

      dropdownOptions
        .querySelectorAll("input[type='checkbox']")
        .forEach((cb) => (cb.checked = cb.value === "ALL"));

      selectAllCheckbox.checked = true;

      currentPage = 1;
      renderBadges();
      applyFiltersAndRender();
      return;
    }

    // Brisanje pojedinog grada
    if (!e.target.dataset.city) return;

    const city = e.target.dataset.city;
    selectedCities = selectedCities.filter((c) => c !== city);

    dropdownOptions.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      if (cb.value === city) cb.checked = false;
    });

    if (selectedCities.length === 0) {
      selectAllCheckbox.checked = true;
    }

    currentPage = 1;
    renderBadges();
    applyFiltersAndRender();
  });

  // ======================
  // SEARCH & SORT
  // ======================
  searchInput.oninput = applyFiltersAndRender;
  sortSelect.onchange = applyFiltersAndRender;

  // ======================
  // HELPERS
  // ======================
  function showSkeleton(count) {
    eventsContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const sk = document.createElement("div");
      sk.className = "skeleton-card";
      eventsContainer.appendChild(sk);
    }
  }

  function hideSkeleton() {
    document.querySelectorAll(".skeleton-card").forEach((el) => el.remove());
  }

  function getDateFormat(timestamp) {
    return timestamp?.toDate().toLocaleDateString("hr-HR");
  }

  // INIT
  fetchEvents();
});
