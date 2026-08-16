// Nuave landing — minimal progressive enhancement.
// No frameworks. Keeps baseline HTML working without JS.

(function () {
  "use strict";

  // FAQ: only one open at a time (progressive enhancement).
  var items = Array.prototype.slice.call(
    document.querySelectorAll("#faq-list .faq__item")
  );
  items.forEach(function (item) {
    var summary = item.querySelector(".faq__q");
    if (!summary) return;
    summary.addEventListener("click", function () {
      // Let the native toggle happen, then close the others.
      var willOpen = !item.open;
      if (willOpen) {
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  // Form: replace with a clear success message. Demo only.
  var form = document.getElementById("start-form");
  var success = document.getElementById("form-success");
  if (form && success) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
      form.querySelector(".form__submit").setAttribute("disabled", "true");
    });
  }
})();
