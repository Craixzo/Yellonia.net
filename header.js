/* ==============================================================
   header.js - the topbar, shared by every page

   Edit the HTML between the two backtick (`) marks below.
   Any change here shows up on every page of the site.

   A page includes it with:   <script src="header.js"></script>
   ============================================================== */

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

        <!-- NAV: HOME (no dropdown) -->
        <li><a href="index.html">Home</a></li>

        <!-- NAV: ORGANIZATION (government + armed forces) -->
        <li class="has-dropdown">
          <a href="structure.html">Structure</a>
          <ul class="dropdown">
            <li class="dropdown-label">Government</li>
            <li><a href="government.html#emperor">The Emperor</a></li>
            <li><a href="government.html#parliament">Parliament</a></li>
            <li><a href="government.html#court">Imperial Supreme Court</a></li>
            <li><a href="government.html#ministries">Ministries</a></li>
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
            <li><a href="emergency-services.html#fire">Fire Service</a></li>
            <li><a href="emergency-services.html#parks">Parks and Wildlife</a></li>
          </ul>
        </li>

        <!-- NAV: NATION (history and lore) -->
        <li class="has-dropdown">
          <a href="nation.html">Nation</a>
          <ul class="dropdown">
            <li><a href="nation.html#history">History</a></li>
            <li><a href="nation.html#states">States</a></li>
            <li><a href="nation.html#capital">The Capital</a></li>
          </ul>
        </li>

        <!-- NAV: JOIN (add class="nav-cta" to make any item the gold button) -->
        <li class="has-dropdown">
          <a href="join.html" class="nav-cta">Join</a>
          <ul class="dropdown">
            <li><a href="join.html">How to enlist</a></li>
            <li><a href="https://www.roblox.com/groups/5801322">Roblox group</a></li>
            <li><a href="https://discord.gg/zYhWhzVcMX" target="_blank" rel="noopener">Discord</a></li>
          </ul>
        </li>

      </ul>
    </nav>

  </div>
</header>
<!-- ===================== END TOPBAR ===================== -->

`);


/* ---------- HIGHLIGHT THE CURRENT PAGE ----------
   Looks at each top-level nav item. If it, or any link in its dropdown,
   points at the page being viewed, its top-level link gets class="current"
   (styled in style.css, section 5). */
(function () {
  var page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  var items = document.querySelectorAll('.nav-list > li');
  for (var i = 0; i < items.length; i++) {
    var links = items[i].querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      var target = links[j].getAttribute('href').split('#')[0].replace('.html', '');
      if (target === page) {
        items[i].querySelector('a').classList.add('current');
        break;
      }
    }
  }
})();
