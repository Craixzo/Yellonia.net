/* ==============================================================
   editor.js - writing articles and changing an outlet's look

     editor.html            write or edit an article   (editor.html?o=SLUG  or  ?o=SLUG&id=ID)
     outlet-settings.html   the outlet's icon, cover, colors and sections   (?o=SLUG)

   Each page says which one it is with <body data-editor="article"> or "settings".
   Pictures are resized in the browser before uploading, which also strips
   hidden information like location data from photos.

   CONTENTS
     1. HELPERS
     2. IMAGES (choosing, resizing, uploading)
     3. ARTICLE EDITOR
     4. OUTLET SETTINGS
     5. START
   ============================================================== */

(function () {

  /* ---------- 1. HELPERS ---------- */
  var page = document.body.getAttribute('data-editor');
  var root = document.getElementById('editor-root');
  if (!page || !root) return;

  var params = new URLSearchParams(location.search);
  var outletSlug = params.get('o') || '';
  var mediaBase = '';                          /* where uploaded images are shown from; sent by the site */
  var ACCENTS = ['#bed215', '#369cd3', '#5bbf49', '#d9534f', '#e8a33d', '#9b6dd6', '#dbdee1'];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function button(text, className, onClick) {
    var b = el('button', className || 'button-small', text);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function post(body) {
    body.outlet = outletSlug;
    return fetch('/api/newsroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    }).then(function (reply) {
      return reply.json().catch(function () { return { success: false, msg: 'Something went wrong. Please try again.' }; });
    }).then(function (data) {
      if (data.mediaBase) mediaBase = data.mediaBase;
      return data;
    }).catch(function () {
      return { success: false, msg: 'Couldn\'t reach the site. Check your connection and try again.' };
    });
  }

  function imageUrl(file) { return file ? mediaBase + file : ''; }

  function field(labelText, control, hint) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field-label', labelText));
    wrap.appendChild(control);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    return wrap;
  }

  function textInput(max, placeholder, value) {
    var box = el('input');
    box.type = 'text';
    box.maxLength = max;
    if (placeholder) box.placeholder = placeholder;
    if (value) box.value = value;
    return box;
  }

  /* A text box that grows as you type */
  function textArea(max, placeholder, value, rows) {
    var box = el('textarea');
    box.maxLength = max;
    box.rows = rows || 3;
    if (placeholder) box.placeholder = placeholder;
    if (value) box.value = value;
    function grow() { box.style.height = 'auto'; box.style.height = box.scrollHeight + 2 + 'px'; }
    box.addEventListener('input', grow);
    setTimeout(grow, 0);
    return box;
  }

  function showMessage(target, kind, text) {
    target.textContent = text || '';
    target.className = 'form-message' + (kind ? ' form-message-' + kind : '');
  }

  function notice(title, text) {
    root.textContent = '';
    var card = el('div', 'login-card');
    card.appendChild(el('h2', null, title));
    card.appendChild(el('p', null, text));
    var back = el('a', 'button-primary', 'Back to your newsroom');
    back.href = '/newsroom.html';
    card.appendChild(back);
    root.appendChild(card);
  }

  /* Asks for a second click instead of a pop-up confirmation */
  function confirmClick(b, confirmText, action) {
    var original = b.textContent, armed = false, timer;
    b.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        b.textContent = confirmText;
        b.classList.add('button-armed');
        timer = setTimeout(function () { armed = false; b.textContent = original; b.classList.remove('button-armed'); }, 4000);
        return;
      }
      clearTimeout(timer);
      armed = false;
      b.textContent = original;
      b.classList.remove('button-armed');
      action();
    });
  }


  /* ---------- 2. IMAGES ---------- */

  /* Lets the person pick a picture, resizes it, uploads it, and gives back the stored file name.
     maxSize: longest side in pixels. square: crop to a square (for icons). */
  function chooseImage(options) {
    return new Promise(function (resolve, reject) {
      var picker = el('input');
      picker.type = 'file';
      picker.accept = 'image/png,image/jpeg,image/webp,image/gif';
      picker.addEventListener('change', function () {
        var file = picker.files && picker.files[0];
        if (!file) return reject(null);
        if (!/^image\//.test(file.type)) return reject('Please choose a picture file.');
        if (file.size > 25 * 1024 * 1024) return reject('That picture is too large. Please choose one under 25 MB.');
        if (options.onStart) options.onStart();
        resize(file, options.maxSize, options.square).then(function (dataUrl) {
          return post({ action: 'upload', data: dataUrl });
        }).then(function (result) {
          if (!result.success) return reject(result.msg);
          resolve(result.file);
        }).catch(function () { reject('That picture couldn\'t be read. Try a PNG or JPEG.'); });
      });
      picker.click();
    });
  }

  function resize(file, maxSize, square) {
    return new Promise(function (resolve, reject) {
      var picture = new Image();
      var url = URL.createObjectURL(file);
      picture.onload = function () {
        URL.revokeObjectURL(url);
        var sx = 0, sy = 0, sw = picture.naturalWidth, sh = picture.naturalHeight;
        if (square) { var side = Math.min(sw, sh); sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side; }
        var scale = Math.min(1, maxSize / Math.max(sw, sh));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        canvas.getContext('2d').drawImage(picture, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        var data = canvas.toDataURL('image/webp', 0.86);           /* small, and keeps transparency */
        if (data.indexOf('data:image/webp') !== 0 || data.length > 3.5e6) data = canvas.toDataURL('image/jpeg', 0.85);
        resolve(data);
      };
      picture.onerror = function () { URL.revokeObjectURL(url); reject(); };
      picture.src = url;
    });
  }

  /* An image slot with Upload / Replace / Remove buttons. onChange(fileName or null) */
  function imageSlot(options) {
    var wrap = el('div', 'image-slot' + (options.square ? ' image-slot-square' : ''));
    var preview = el('div', 'image-slot-preview');
    var actions = el('div', 'image-slot-actions');
    var status = el('p', 'form-message');
    var current = options.file || null;

    function draw() {
      preview.textContent = '';
      if (current) {
        var pic = el('img');
        pic.src = imageUrl(current);
        pic.alt = '';
        preview.appendChild(pic);
      } else {
        preview.appendChild(el('span', 'image-slot-empty', options.emptyText || 'No picture'));
      }
      actions.textContent = '';
      actions.appendChild(button(current ? 'Replace' : 'Upload a picture', 'button-small', pick));
      if (current) actions.appendChild(button('Remove', 'button-small', function () { current = null; draw(); options.onChange(null); }));
    }

    function pick() {
      chooseImage({
        maxSize: options.maxSize,
        square: options.square,
        onStart: function () { showMessage(status, null, 'Uploading...'); },
      }).then(function (file) {
        showMessage(status, null, '');
        current = file;
        draw();
        options.onChange(file);
      }).catch(function (problem) { if (problem) showMessage(status, 'error', problem); });
    }

    draw();
    wrap.appendChild(preview);
    wrap.appendChild(actions);
    wrap.appendChild(status);
    return wrap;
  }


  /* ---------- 3. ARTICLE EDITOR ---------- */
  var BLOCK_NAMES = { p: 'Paragraph', h2: 'Sub-heading', quote: 'Quote', img: 'Picture' };

  function articleEditor(data) {
    var outlet = data.outlet;
    var article = data.article || { status: 'DRAFT', body: [{ type: 'p', text: '' }] };
    var articleId = article.id || null;
    var previewKey = article.previewKey || null;
    var coverFile = article.coverFile || null;
    var dirty = false;
    var locked = article.status === 'SUBMITTED';

    document.title = (article.headline || 'New article') + ' | ' + outlet.name;
    root.textContent = '';

    var top = el('div', 'editor-top');
    var back = el('a', 'text-link', 'Back to your newsroom');
    back.href = '/newsroom.html';
    top.appendChild(back);
    top.appendChild(el('span', 'editor-outlet', outlet.name));
    root.appendChild(top);

    var STATUS = {
      DRAFT: 'Draft. Only you' + (outlet.isOwner ? '' : ' and the owner') + ' can see it.',
      SUBMITTED: 'Waiting for the Ministry of Commerce to review it. It can\'t be edited until then.',
      PUBLISHED: 'Published. Saving changes takes it off the site until it\'s reviewed again.',
      REJECTED: 'Not approved' + (article.reviewNote ? ': ' + article.reviewNote : '.') + ' Edit it and send it again.',
    };
    var statusLine = el('p', 'editor-status status-' + String(article.status).toLowerCase(), STATUS[article.status] || '');
    root.appendChild(statusLine);

    var form = el('div', 'news-form editor-form');

    var headline = textArea(160, 'Headline', article.headline, 1);
    headline.className = 'editor-headline';
    form.appendChild(field('Headline', headline));

    var summary = textArea(400, 'One or two sentences that sum up the story.', article.summary, 2);
    form.appendChild(field('Summary', summary, 'Shown under the headline and on story cards.'));

    var section = el('select');
    section.appendChild(new Option('No section', ''));
    (outlet.sections || []).forEach(function (name) { section.appendChild(new Option(name, name)); });
    section.value = article.section || '';
    form.appendChild(field('Section', section, outlet.sections && outlet.sections.length ? null : 'Your outlet has no sections yet. The owner can add them in Outlet settings.'));

    var coverWrap = el('div', 'field');
    coverWrap.appendChild(el('span', 'field-label', 'Cover picture'));
    coverWrap.appendChild(imageSlot({ file: coverFile, maxSize: 1600, emptyText: 'No cover picture', onChange: function (file) { coverFile = file; markDirty(); } }));
    var coverCaption = textInput(300, 'Caption (optional)', article.coverCaption);
    coverWrap.appendChild(coverCaption);
    form.appendChild(coverWrap);

    var coverStory = null;
    if (outlet.isOwner) {
      var check = el('label', 'check');
      coverStory = el('input');
      coverStory.type = 'checkbox';
      coverStory.checked = !!article.isCoverStory;
      check.appendChild(coverStory);
      check.appendChild(el('span', null, 'Make this the cover story (the big story at the top of the front page)'));
      form.appendChild(check);
    }

    /* The body: a list of parts that can be added, moved and removed */
    var bodyWrap = el('div', 'field');
    bodyWrap.appendChild(el('span', 'field-label', 'Article'));
    var blocksList = el('div', 'blocks');
    bodyWrap.appendChild(blocksList);
    var addBar = el('div', 'block-add');
    Object.keys(BLOCK_NAMES).forEach(function (type) {
      addBar.appendChild(button('+ ' + BLOCK_NAMES[type], 'button-small', function () {
        if (type === 'img') {
          chooseImage({ maxSize: 1600 }).then(function (file) { addBlock({ type: 'img', file: file }, true); })
            .catch(function (problem) { if (problem) showMessage(message, 'error', problem); });
        } else {
          addBlock({ type: type, text: '' }, true);
        }
      }));
    });
    bodyWrap.appendChild(addBar);
    form.appendChild(bodyWrap);

    function addBlock(block, focus) {
      var card = el('div', 'block block-' + block.type);
      card._block = block;
      var head = el('div', 'block-head');
      head.appendChild(el('span', 'block-name', BLOCK_NAMES[block.type]));
      var tools = el('div', 'block-tools');
      tools.appendChild(button('Up', 'button-small', function () { if (card.previousSibling) { blocksList.insertBefore(card, card.previousSibling); markDirty(); } }));
      tools.appendChild(button('Down', 'button-small', function () { if (card.nextSibling) { blocksList.insertBefore(card.nextSibling, card); markDirty(); } }));
      var remove = button('Remove', 'button-small');
      confirmClick(remove, 'Click again', function () { card.remove(); markDirty(); });
      tools.appendChild(remove);
      head.appendChild(tools);
      card.appendChild(head);

      var first;
      if (block.type === 'p') {
        first = textArea(6000, 'Write a paragraph...', block.text, 3);
        first.addEventListener('input', function () { block.text = first.value; });
        card.appendChild(first);
      } else if (block.type === 'h2') {
        first = textInput(200, 'Sub-heading', block.text);
        first.addEventListener('input', function () { block.text = first.value; });
        card.appendChild(first);
      } else if (block.type === 'quote') {
        first = textArea(1000, 'The quote', block.text, 2);
        first.addEventListener('input', function () { block.text = first.value; });
        var by = textInput(120, 'Who said it (optional)', block.by);
        by.addEventListener('input', function () { block.by = by.value; });
        card.appendChild(first);
        card.appendChild(by);
      } else if (block.type === 'img') {
        var pic = el('img', 'block-image');
        pic.src = imageUrl(block.file);
        pic.alt = '';
        var caption = textInput(300, 'Caption (optional)', block.caption);
        caption.addEventListener('input', function () { block.caption = caption.value; });
        card.appendChild(pic);
        card.appendChild(caption);
      }
      blocksList.appendChild(card);
      if (focus && first) first.focus();
      if (focus) markDirty();
    }

    (article.body && article.body.length ? article.body : [{ type: 'p', text: '' }]).forEach(function (block) { addBlock(Object.assign({}, block), false); });

    /* Action bar */
    var bar = el('div', 'editor-actions');
    var message = el('p', 'form-message');
    message.setAttribute('role', 'status');
    var saveButton = button('Save draft', 'button-secondary');
    var previewButton = button('Preview', 'button-secondary');
    var submitButton = button('Send for review', 'button-primary');
    var deleteButton = button('Delete', 'button-small button-delete');
    bar.appendChild(message);
    var buttons = el('div', 'editor-buttons');
    buttons.appendChild(deleteButton);
    buttons.appendChild(saveButton);
    buttons.appendChild(previewButton);
    buttons.appendChild(submitButton);
    bar.appendChild(buttons);
    form.appendChild(bar);
    root.appendChild(form);

    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    function markDirty() { dirty = true; }
    window.addEventListener('beforeunload', function (event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

    if (locked) {
      Array.prototype.forEach.call(form.querySelectorAll('input, textarea, select, button'), function (control) { control.disabled = true; });
      previewButton.disabled = false;
    }
    if (!articleId) deleteButton.hidden = true;

    function collect() {
      var body = Array.prototype.map.call(blocksList.children, function (card) { return card._block; });
      return {
        action: 'article-save',
        id: articleId,
        headline: headline.value,
        summary: summary.value,
        section: section.value,
        coverFile: coverFile,
        coverCaption: coverCaption.value,
        isCoverStory: coverStory ? coverStory.checked : undefined,
        body: body,
      };
    }

    function save() {
      if (headline.value.trim().length < 5) { showMessage(message, 'error', 'The headline must be at least 5 characters.'); headline.focus(); return Promise.resolve(null); }
      showMessage(message, null, 'Saving...');
      return post(collect()).then(function (result) {
        if (!result.success) { showMessage(message, 'error', result.msg); return null; }
        dirty = false;
        if (!articleId) {
          articleId = result.id;
          history.replaceState(null, '', '/editor.html?o=' + encodeURIComponent(outletSlug) + '&id=' + encodeURIComponent(articleId));
          deleteButton.hidden = false;
        }
        previewKey = result.previewKey || previewKey;
        statusLine.textContent = STATUS.DRAFT;
        statusLine.className = 'editor-status status-draft';
        showMessage(message, 'ok', result.msg);
        return result;
      });
    }

    saveButton.addEventListener('click', function () { save(); });

    previewButton.addEventListener('click', function () {
      /* Opened straight away so the browser doesn't block it, then pointed at the preview once saved */
      var tab = window.open('', '_blank');
      var ready = locked ? Promise.resolve({}) : save();
      ready.then(function (result) {
        if ((!result && !locked) || !previewKey) { if (tab) tab.close(); return; }
        if (tab) tab.location = '/article.html?preview=' + previewKey;
      });
    });

    submitButton.addEventListener('click', function () {
      save().then(function (result) {
        if (!result) return;
        showMessage(message, null, 'Sending...');
        post({ action: 'article-submit', id: articleId }).then(function (sent) {
          if (!sent.success) return showMessage(message, 'error', sent.msg);
          dirty = false;
          notice('Sent for review', 'The Ministry of Commerce will review your article. Centurion will DM you when it\'s published, or if it needs changes.');
        });
      });
    });

    confirmClick(deleteButton, 'Click again to delete', function () {
      post({ action: 'article-delete', id: articleId }).then(function (result) {
        if (!result.success) return showMessage(message, 'error', result.msg);
        dirty = false;
        notice('Article deleted', 'The article has been deleted.');
      });
    });
  }


  /* ---------- 4. OUTLET SETTINGS ---------- */
  function settingsEditor(outlet) {
    document.title = 'Outlet settings | ' + outlet.name;
    root.textContent = '';
    var iconFile = outlet.iconFile, coverFile = outlet.coverFile, accent = outlet.accentColor;

    var top = el('div', 'editor-top');
    var back = el('a', 'text-link', 'Back to your newsroom');
    back.href = '/newsroom.html';
    top.appendChild(back);
    top.appendChild(el('span', 'editor-outlet', outlet.name));
    root.appendChild(top);

    var form = el('div', 'news-form');

    /* Live preview of the masthead */
    var preview = el('div', 'settings-preview');
    var previewCover = el('img', 'settings-preview-cover');
    previewCover.alt = '';
    var previewTitle = el('div', 'settings-preview-title');
    var previewIcon = el('img', 'settings-preview-icon');
    previewIcon.alt = '';
    previewTitle.appendChild(previewIcon);
    previewTitle.appendChild(el('span', null, outlet.name));
    var previewTagline = el('p', 'settings-preview-tagline');
    preview.appendChild(previewCover);
    preview.appendChild(previewTitle);
    preview.appendChild(previewTagline);
    form.appendChild(field('Preview', preview));

    function redraw() {
      preview.style.setProperty('--accent', accent);
      preview.classList.toggle('has-cover', !!coverFile);
      previewCover.hidden = !coverFile;
      if (coverFile) previewCover.src = imageUrl(coverFile);
      previewIcon.hidden = !iconFile;
      if (iconFile) previewIcon.src = imageUrl(iconFile);
      previewTagline.textContent = tagline.value.trim();
    }

    var iconWrap = el('div', 'field');
    iconWrap.appendChild(el('span', 'field-label', 'Icon'));
    iconWrap.appendChild(imageSlot({ file: iconFile, maxSize: 512, square: true, emptyText: 'No icon', onChange: function (f) { iconFile = f; redraw(); } }));
    iconWrap.appendChild(el('span', 'field-hint', 'A square logo. Pictures that aren\'t square are cropped to the middle.'));
    form.appendChild(iconWrap);

    var coverWrap = el('div', 'field');
    coverWrap.appendChild(el('span', 'field-label', 'Cover picture'));
    coverWrap.appendChild(imageSlot({ file: coverFile, maxSize: 1920, emptyText: 'No cover picture', onChange: function (f) { coverFile = f; redraw(); } }));
    coverWrap.appendChild(el('span', 'field-hint', 'Shown behind your name at the top of your front page, and on your card in the News directory. Wide pictures work best.'));
    form.appendChild(coverWrap);

    var tagline = textInput(120, 'One short line under your name', outlet.tagline);
    tagline.addEventListener('input', redraw);
    form.appendChild(field('Tagline', tagline));

    var description = textArea(600, 'What your outlet covers, and who it\'s for.', outlet.description, 3);
    form.appendChild(field('Description', description));

    var sections = textInput(200, 'Politics, Military, Economy', (outlet.sections || []).join(', '));
    form.appendChild(field('Sections', sections, 'Up to 8, separated by commas. Writers file each article under one of these.'));

    var colorWrap = el('div', 'field');
    colorWrap.appendChild(el('span', 'field-label', 'Accent color'));
    var swatches = el('div', 'swatches');
    var custom = el('input');
    custom.type = 'color';
    custom.className = 'swatch-custom';
    custom.setAttribute('aria-label', 'Custom color');
    function pick(color) {
      accent = color;
      custom.value = color;
      Array.prototype.forEach.call(swatches.querySelectorAll('.swatch'), function (s) {
        s.setAttribute('aria-pressed', s.getAttribute('data-color') === color ? 'true' : 'false');
      });
      redraw();
    }
    ACCENTS.forEach(function (color) {
      var swatch = button('', 'swatch', function () { pick(color); });
      swatch.style.background = color;
      swatch.setAttribute('data-color', color);
      swatch.setAttribute('aria-label', 'Accent color ' + color);
      swatches.appendChild(swatch);
    });
    custom.addEventListener('input', function () { pick(custom.value); });
    swatches.appendChild(custom);
    colorWrap.appendChild(swatches);
    form.appendChild(colorWrap);

    var message = el('p', 'form-message');
    message.setAttribute('role', 'status');
    var save = button('Save changes', 'button-primary', function () {
      save.disabled = true;
      showMessage(message, null, 'Saving...');
      post({
        action: 'outlet-update',
        tagline: tagline.value,
        description: description.value,
        sections: sections.value,
        accentColor: accent,
        iconFile: iconFile,
        coverFile: coverFile,
      }).then(function (result) {
        save.disabled = false;
        showMessage(message, result.success ? 'ok' : 'error', result.msg);
      });
    });
    form.appendChild(save);
    form.appendChild(el('p', 'field-hint', 'Your outlet\'s name can only be changed by the Ministry of Commerce.'));
    form.appendChild(message);
    root.appendChild(form);
    pick(accent || ACCENTS[1]);
  }


  /* ---------- 5. START ---------- */
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (reply) { return reply.json(); })
    .then(function (me) {
      if (!me.user) {
        root.textContent = '';
        var card = el('div', 'login-card');
        card.appendChild(el('p', null, 'Log in with Discord to continue.'));
        var login = el('a', 'button-discord', 'Log in with Discord');
        login.href = '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.search);
        card.appendChild(login);
        root.appendChild(card);
        return null;
      }
      return page === 'settings'
        ? post({ action: 'outlet-settings' }).then(function (result) {
            if (!result.success) return notice('Can\'t open these settings', result.msg);
            settingsEditor(result.outlet);
          })
        : post({ action: 'article', id: params.get('id') || undefined }).then(function (result) {
            if (!result.success) return notice('Can\'t open this article', result.msg);
            articleEditor(result);
          });
    })
    .catch(function () { notice('This page couldn\'t load', 'Please try again in a minute.'); });
})();
