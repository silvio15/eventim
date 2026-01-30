document.addEventListener("DOMContentLoaded", function () {
  // Dohvat ID eventa iz URL-a (npr. event.html?eventId=abc123)
  const imgContainer = document.getElementById("event-hero");
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId");

  if (!eventId) {
    console.error("Nije proslijeđen ID eventa!");
    return;
  }

  // Firestore instanca
  const db = firebase.firestore();

  const eventDaysContainer = document.querySelector(".event-days");

  // Dohvat dokumenta eventa
  db.collection("events")
    .doc(eventId)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.error("Event ne postoji!");
        return;
      }

      const event = doc.data();

      imgContainer.innerHTML = `<img src="${event.imageUrl}" alt="${event.title}"><h1 class="event-title">${event.title}</h1>`;

      // Popuni opis događaja
      const eventDescriptionSection = document.querySelector(
        ".event-description p"
      );
      eventDescriptionSection.textContent = event.description;

      // Dohvat podkolekcije eventDays
      db.collection("events")
        .doc(eventId)
        .collection("eventDays")
        .orderBy("date", "asc")
        .get()
        .then((snapshot) => {
          if (snapshot.empty) {
            console.log("Nema dana za ovaj event");
            return;
          }

          // Očisti postojeće dane (ako postoje)
          eventDaysContainer.innerHTML = "";

          snapshot.forEach((dayDoc) => {
            const day = dayDoc.data();

            // Pretvorba Firestore Timestamp u JS Date
            const dateObj = day.date.toDate
              ? day.date.toDate()
              : new Date(day.date.seconds * 1000);

            const price = day.price ? `${day.price} €` : "free";
            const dayHtml = document.createElement("a");
            dayHtml.href =
              "stage.html?eventId=" + eventId + "&dayId=" + dayDoc.id;
            dayHtml.innerHTML = `
              <article class="event-day">
                <div class="event-day-date">
                  <p class="day">${dateObj.getDate()}</p>
                  <p class="month">${("0" + (dateObj.getMonth() + 1)).slice(
                    -2
                  )} / ${dateObj.getFullYear()}</p>
                  <p class="weekday">${day.dayName} · ${day.time}</p>
                </div>
                <div class="event-day-info">
                  <div>
                    <p class="event-title">${event.title}</p>
                    <p class="event-location">${event.location}</p>
                    <p class="event-hall">${day.hall || ""}</p>
                  </div>
                  <div class="event-day-meta">
                    <p class="price">${price} </p>
                    <p class="note">${day.note || "Slobodna mjesta"}</p>
                  </div>
                </div>
              </article>
            `;

            eventDaysContainer.appendChild(dayHtml);
          });
        })
        .catch((err) =>
          console.error("Greška prilikom dohvaćanja eventDays:", err)
        );
    })
    .catch((err) => console.error("Greška prilikom dohvaćanja eventa:", err));
});
