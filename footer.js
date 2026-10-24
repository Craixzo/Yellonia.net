/* ==============================================================
   footer.js - the footer, shared by every page

   Edit the HTML between the two backtick (`) marks below.
   Any change here shows up on every page of the site.

   A page includes it with:   <script src="footer.js"></script>
   ============================================================== */

document.currentScript.insertAdjacentHTML('beforebegin', `

<!-- ======================= FOOTER ======================= -->
<footer class="footer">
  <div class="footer-inner">

    <!-- FOOTER: LOGO + SHORT DESCRIPTION -->
    <div class="footer-brand">
      <a class="logo" href="index.html">
        <img src="images/TYEcoatofarms.png" alt="" width="44" height="44">
        <span class="logo-text">Yellonia</span>
      </a>
      <p>The official website for Yellonia.</p>

     <!-- FOOTER: SOCIAL ICONS (logo files are set in style.css, section 15) -->
      <div class="footer-social">
        <a href="https://discord.gg/zYhWhzVcMX" target="_blank" rel="noopener" aria-label="Discord"><span class="social-icon social-discord"></span></a>
        <a href="https://www.roblox.com/groups/5801322" target="_blank" rel="noopener" aria-label="Roblox group"><span class="social-icon social-roblox"></span></a>
        <a href="https://www.youtube.com/@yellonianimperialbroadcast" target="_blank" rel="noopener" aria-label="YouTube"><span class="social-icon social-youtube"></span></a>
        <!-- TIKTOK: paste the link in place of LINK-HERE, then delete the two comment marks around this line -->
        <!-- <a href="LINK-HERE" target="_blank" rel="noopener" aria-label="TikTok"><span class="social-icon social-tiktok"></span></a> -->
      </div>
    </div>

    <!-- FOOTER: LINK COLUMNS (copy a <div> block to add a column) -->
    <div class="footer-links">

      <!-- COLUMN: SITE -->
      <div>
        <h2>Site</h2>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="structure.html">Structure</a></li>
          <li><a href="economy.html">Economy</a></li>
          <li><a href="emergency-services.html">Emergency Services</a></li>
          <li><a href="nation.html">Nation</a></li>
          <li><a href="news.html">News</a></li>
        </ul>
      </div>

      <!-- COLUMN: OTHER YELLONIAN WEBSITES -->
      <div>
        <h2>Related Sites</h2>
        <ul>
          <li><a href="https://ssd-secure-portal.vercel.app/" target="_blank" rel="noopener">State Security Directorate</a></li>
          <li><a href="https://catwatcher.org/" target="_blank" rel="noopener">CatWatcher</a></li>
        </ul>
      </div>

      <!-- COLUMN: COMMUNITY -->
      <div>
        <h2>Community</h2>
        <ul>
          <li><a href="https://www.roblox.com/groups/5801322">Roblox group</a></li>
          <li><a href="https://discord.gg/zYhWhzVcMX">Discord</a></li>
          <li><a href="https://www.youtube.com/@yellonianimperialbroadcast" target="_blank" rel="noopener">YouTube</a></li>
          <!-- <li><a href="LINK-HERE" target="_blank" rel="noopener">TikTok</a></li> -->
        </ul>
      </div>

    </div>
  </div>

  <!-- FOOTER: BOTTOM LINE -->
  <div class="footer-bottom">
    <p>&copy; 2026 Yellonia. A community project, not affiliated with Roblox Corporation.</p>
  </div>
</footer>
<!-- ===================== END FOOTER ===================== -->

`);
