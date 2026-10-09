/* ==============================================================
   script.js - behavior shared by every page

   A page includes it with:   <script src="script.js"></script>
   Put that line near the bottom of the page, after the footer.

   CONTENTS
     1. TOPBAR HIDE ON SCROLL
   ============================================================== */


/* ---------- 1. TOPBAR HIDE ON SCROLL ----------
   Slides the bar up when scrolling down, brings it back when scrolling up. */
(function () {
  var bar = document.querySelector('.topbar');
  var menu = document.getElementById('nav-toggle');
  var last = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (y > last && y > 120 && !menu.checked) {
      bar.classList.add('topbar-hidden');      /* scrolling down */
    } else if (y < last) {
      bar.classList.remove('topbar-hidden');   /* scrolling up */
    }
    last = y;
  }, { passive: true });
})();
