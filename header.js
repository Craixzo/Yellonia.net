/* ==============================================================
   header.js - the topbar, shared by every page

   Edit the HTML between the two backtick (`) marks below.
   Any change here shows up on every page of the site.

   A page includes it with:   <script src="header.js"></script>
   ============================================================== */

/* ---------- LIGHT / DARK THEME ----------
   Dark by default. The sun/moon button switches it, and the browser remembers. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem('yn-theme'); } catch (e) {}
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

document.currentScript.insertAdjacentHTML('beforebegin', `

<!-- ======================= TOPBAR ======================= -->
<header class="topbar">
  <div class="topbar-inner">

    <!-- LOGO: clicking it goes to the homepage -->
    <a class="logo" href="index.html">
      <img src="images/TYEcoatofarms.png" alt="" width="44" height="44">
      <span class="logo-text">Yellonia</span>
    </a>

    <!-- MOBILE MENU BUTTON: only visible on small screens (no JavaScript) -->
    <input type="checkbox" id="nav-toggle" class="nav-toggle">
    <label for="nav-toggle" class="nav-button">Menu</label>

    <!-- NAV
         Plain link:      <li><a href="page.html">Name</a></li>
         With dropdown:   <li class="has-dropdown"> ... <ul class="dropdown"> ... </ul></li>
         The link for the page you're on is highlighted automatically. -->
    <nav class="nav" aria-label="Main">
      <ul class="nav-list">

        <!-- NAV: ORGANIZATION (government + armed forces) -->
        <li class="has-dropdown">
          <a href="structure.html">Structure</a>
          <ul class="dropdown">
            <li><a href="structure.html">Structure Chart</a></li>
            <li class="dropdown-label">Government</li>
            <li><a href="government.html#emperor">The Emperor</a></li>
            <li><a href="government.html#parliament">Parliament</a></li>
            <li><a href="government.html#court">Imperial Supreme Court</a></li>
            <li><a href="government.html#ministries">Ministries</a></li>
            <li><a href="legislation.html">Bills and laws</a></li>
            <li><a href="constitution.html">The Constitution</a></li>
            <li><a href="documents.html">Official Documents</a></li>
            <li class="dropdown-label">Armed Forces</li>
            <li><a href="armed-forces.html#army">Army</a></li>
            <li><a href="armed-forces.html#special-forces">Special Forces</a></li>
            <li><a href="armed-forces.html#navy">Navy</a></li>
            <li><a href="armed-forces.html#air-force">Air Force</a></li>
            <li><a href="armed-forces.html#military-police">Military Police</a></li>
          </ul>
        </li>

        <!-- NAV: ECONOMY -->
        <li class="has-dropdown">
          <a href="economy.html">Economy</a>
          <ul class="dropdown">
            <li><a href="economy.html#corporations">Corporations</a></li>
            <li><a href="economy.html#stock-market">Stock Market</a></li>
            <li><a href="economy.html#housing">Housing</a></li>
          </ul>
        </li>

        <!-- NAV: EMERGENCY SERVICES (placeholder name, change the text below) -->
        <li class="has-dropdown">
          <a href="emergency-services.html">Emergency Services</a>
          <ul class="dropdown">
            <li><a href="emergency-services.html#police">Police Department</a></li>
            <li><a href="emergency-services.html#fire">Fire Department</a></li>
            <li><a href="emergency-services.html#parks">Parks and Wildlife</a></li>
            <li><a href="wanted.html">Most Wanted</a></li>
            <li><a href="report.html">Complaints and Reports</a></li>
            <li><a href="apply.html">Join Emergency Services</a></li>
            <li><a href="board-of-commissioners.html">Board of Commissioners</a></li>
            <li><a href="des/login.html">Service Login</a></li>
          </ul>
        </li>

        <!-- NAV: NEWS -->
        <li class="has-dropdown">
          <a href="news.html">News</a>
          <ul class="dropdown">
            <li><a href="news.html#latest">Latest stories</a></li>
            <li><a href="news.html#outlets">News outlets</a></li>
            <li><a href="news-register.html">Start an outlet</a></li>
            <li><a href="newsroom.html">Your newsroom</a></li>
          </ul>
        </li>

        <!-- NAV: COMMUNITY -->
        <li class="has-dropdown">
          <a href="jobs.html">Community</a>
          <ul class="dropdown">
            <li><a href="jobs.html">Job Board</a></li>
            <li><a href="https://wiki.yellonia.net" target="_blank" rel="noopener">Wiki</a></li>
            <li><a href="contact.html">Contact Staff</a></li>
            <li><a href="brand.html">Brand Kit</a></li>
            <li><a href="staff.html">Staff Area</a></li>
          </ul>
        </li>

        <!-- NAV: THEME (sun/moon button) -->
        <li class="nav-theme">
          <button type="button" class="theme-toggle" aria-label="Switch to light theme">
            <svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            <svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          </button>
        </li>

        <!-- NAV: JOIN (add class="nav-cta" to make any item the gold button) -->
        <li>
          <a href="https://discord.gg/zYhWhzVcMX" class="nav-cta" target="_blank" rel="noopener">Join</a>
        </li>

      </ul>
    </nav>

  </div>
</header>
<!-- ===================== END TOPBAR ===================== -->

`);


/* ---------- THEME BUTTON ---------- */
(function () {
  var button = document.querySelector('.theme-toggle');
  if (!button) return;
  function label() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    button.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    button.title = light ? 'Dark theme' : 'Light theme';
  }
  label();
  button.addEventListener('click', function () {
    var light = document.documentElement.getAttribute('data-theme') !== 'light';
    if (light) document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('yn-theme', light ? 'light' : 'dark'); } catch (e) {}
    label();
  });
})();


/* ---------- HIGHLIGHT THE CURRENT PAGE ----------
   Looks at each top-level nav item. If it, or any link in its dropdown,
   points at the page being viewed, its top-level link gets class="current"
   (styled in style.css, section 5). */
(function () {
  var page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  if (['outlet', 'article', 'newsroom', 'news-register', 'editor', 'outlet-settings'].indexOf(page) !== -1) page = 'news';   /* news pages belong under News */
  var items = document.querySelectorAll('.nav-list > li');
  for (var i = 0; i < items.length; i++) {
    var links = items[i].querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      var target = (links[j].getAttribute('href') || '').split('#')[0].replace('.html', '');
      if (target === page) {
        items[i].querySelector('a').classList.add('current');
        break;
      }
    }
  }
})();
