/* Nuave FAQ preview - accessible accordion.
   One item open at a time; chevron rotates; aria-expanded + aria-controls
   kept in sync. Content stays in the DOM (display:none only), so all copy
   remains readable without JS. */
(function () {
  var items = document.querySelectorAll(".item");

  items.forEach(function (item) {
    var btn = item.querySelector(".item__q");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");

      // Close every item first (accordion behaviour: one at a time).
      items.forEach(function (other) {
        other.classList.remove("is-open");
        var otherBtn = other.querySelector(".item__q");
        if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
      });

      // Then open the clicked one, unless it was the one already open.
      if (!isOpen) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
})();
