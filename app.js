(function () {
  "use strict";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function escapeXml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch];
    });
  }

  var SHAPES = {
    square: { width: 400, height: 400, font: 120 },
    agent: { width: 440, height: 400, font: 120 },
    wide: { width: 512, height: 150, font: 64 },
    card: { width: 268, height: 640, font: 96 }
  };

  function placeholderImage(label, shape) {
    var first = Array.from(String(label || "?").trim()).slice(0, 1).join("") || "?";
    var size = SHAPES[shape] || SHAPES.square;
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var bg = dark ? "#2c2c2e" : "#e8e8ed";
    var fg = dark ? "#86868b" : "#a1a1a6";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size.width + '" height="' + size.height +
      '" viewBox="0 0 ' + size.width + " " + size.height + '">' +
      '<rect width="' + size.width + '" height="' + size.height + '" fill="' + bg + '"/>' +
      '<text x="' + size.width / 2 + '" y="' + (size.height / 2 + size.font * 0.36) +
      '" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" ' +
      'font-size="' + size.font + '" font-weight="500" fill="' + fg + '">' + escapeXml(first) + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function setImage(node, url, label, shape) {
    var fallback = placeholderImage(label, shape);
    node.alt = label || "";
    node.onerror = function () {
      node.onerror = null;
      node.src = fallback;
    };
    node.src = url || fallback;
  }

  function makeImage(url, label, className, eager, shape, cors) {
    var node = el("img", className);
    if (!eager) node.loading = "lazy";
    if (cors && url) node.crossOrigin = "anonymous";
    setImage(node, url, label, shape);
    return node;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setFavicon(url) {
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function setCircularFavicon(url) {
    var image;
    try {
      image = new Image();
    } catch (e) {
      setFavicon(url);
      return;
    }
    image.crossOrigin = "anonymous";
    image.onload = function () {
      try {
        var size = 64;
        var canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, 0, 0, size, size);
        setFavicon(canvas.toDataURL("image/png"));
      } catch (e) {
        setFavicon(url);
      }
    };
    image.onerror = function () {
      setFavicon(url);
    };
    image.src = url;
  }

  function renderHeader() {
    var rank = PROFILE.peakRank || {};

    document.title = (PROFILE.name || "无名玩家") + " #" + (PROFILE.tag || "0000");
    if (PROFILE.avatar) {
      setCircularFavicon(PROFILE.avatar);
    } else {
      setFavicon(placeholderImage(PROFILE.name, "square"));
    }

    byId("avatar").appendChild(makeImage(PROFILE.avatar, PROFILE.name, "", true));
    byId("player-name").textContent = PROFILE.name || "无名玩家";
    byId("player-tag").textContent = "#" + (PROFILE.tag || "0000");

    byId("rank-icon").appendChild(makeImage(rank.image, rank.name, "", true));
    byId("rank-name").textContent = rank.name || "暂无段位";
    byId("play-time").textContent = PROFILE.playTime || "--";
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h, s: s, l: l };
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function prefersDark() {
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function applyAgentTint(card, image) {
    var base = null;

    function paint() {
      if (!base) return;
      var dark = prefersDark();
      var lightness = dark ? 0.24 : 0.72;
      var saturation = Math.min(0.8, Math.max(0.35, base.s));
      var rgb = hslToRgb(base.h, saturation, lightness);
      card.style.background = "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")";
      card.classList.add("tinted");
      var lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
      card.classList.toggle("tone-dark", lum > 0.42);
      card.classList.toggle("tone-light", lum <= 0.42);
    }

    function sample() {
      var canvas, ctx, data;
      try {
        canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, 16, 16);
        data = ctx.getImageData(0, 0, 16, 16).data;
      } catch (e) {
        return;
      }
      var r = 0;
      var g = 0;
      var b = 0;
      var n = 0;
      for (var i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 160) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      if (!n) return;
      base = rgbToHsl(r / n, g / n, b / n);
      paint();
    }

    if (image.complete && image.naturalWidth) sample();
    image.addEventListener("load", sample);
    image.addEventListener("error", sample);

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", paint);
      else if (mq.addListener) mq.addListener(paint);
    }
  }

  function renderAgents() {
    var grid = byId("agents");
    var agents = PROFILE.agents || [];
    if (!agents.length) {
      grid.appendChild(el("p", "empty", "暂无英雄数据，编辑 data.js 添加。"));
      return;
    }
    agents.forEach(function (agent) {
      var card = el("article", "agent-card");
      var image = makeImage(agent.image, agent.name, "agent-img", false, "agent", true);
      applyAgentTint(card, image);
      card.appendChild(image);
      card.appendChild(el("h3", "agent-name", agent.name));
      if (agent.role) card.appendChild(el("span", "agent-role", agent.role));

      grid.appendChild(card);
    });
  }

  function renderFavoriteSkins() {
    var grid = byId("favorite-skins");
    var skins = PROFILE.favoriteSkins || [];
    if (!skins.length) {
      grid.appendChild(el("p", "empty", "暂无皮肤数据，编辑 data.js 添加。"));
      return;
    }
    skins.forEach(function (skin) {
      var card = el("article", "skin-card");
      card.appendChild(makeImage(skin.image, skin.name, "skin-thumb", false, "wide"));

      var info = el("div", "skin-info");
      var title = el("div", "skin-title");
      if (skin.tier) {
        var tiers = PROFILE.skinTiers || {};
        title.appendChild(makeImage(tiers[skin.tier] || "", skin.tier, "skin-tier", false, "square"));
      }
      title.appendChild(el("span", "skin-name", skin.name));
      info.appendChild(title);
      info.appendChild(el("span", "skin-weapon", skin.weapon || ""));
      card.appendChild(info);

      grid.appendChild(card);
    });
  }

  function roundedArrowPath(w, h, radius) {
    var yb = Math.max(0, h - w / 2);
    var A = { x: 0, y: 0 };
    var B = { x: w, y: 0 };
    var C = { x: w, y: yb };
    var D = { x: w / 2, y: h };
    var E = { x: 0, y: yb };

    function unit(from, to) {
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: dx / len, y: dy / len, len: len };
    }

    function corner(P, prev, next) {
      var a = unit(P, prev);
      var b = unit(P, next);
      var r = Math.min(radius, a.len / 2, b.len / 2);
      return {
        in: { x: P.x + a.x * r, y: P.y + a.y * r },
        out: { x: P.x + b.x * r, y: P.y + b.y * r },
        p: P
      };
    }

    function n(v) {
      return v.x.toFixed(2) + " " + v.y.toFixed(2);
    }

    var c = corner(C, B, D);
    var d = corner(D, C, E);
    var e = corner(E, D, A);

    return (
      "M " + n(A) +
      " L " + n(B) +
      " L " + n(c.in) +
      " Q " + n(c.p) + " " + n(c.out) +
      " L " + n(d.in) +
      " Q " + n(d.p) + " " + n(d.out) +
      " L " + n(e.in) +
      " Q " + n(e.p) + " " + n(e.out) +
      " Z"
    );
  }

  function applyCardClip(media, image) {
    function update() {
      var w = media.clientWidth;
      var h = media.clientHeight;
      if (!w || !h) return;
      var radius = Math.min(12, w * 0.09);
      media.style.clipPath = 'path("' + roundedArrowPath(w, h, radius) + '")';
      media.style.setProperty("--card-fade", (100 - (w / h) * 50).toFixed(2) + "%");
      media.style.setProperty("--card-tri", w / 2 + "px");
    }
    if (image.complete) update();
    image.addEventListener("load", update);
    image.addEventListener("error", update);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(update).observe(media);
    } else {
      window.addEventListener("resize", update);
    }
  }

  function applyCaptionTone(media, image, caption) {
    function sample() {
      var W = media.clientWidth;
      var H = media.clientHeight;
      var w = image.naturalWidth;
      var h = image.naturalHeight;
      if (!W || !H || !w || !h) return;
      var cw = 32;
      var ch = Math.max(1, Math.round((32 * h) / w));
      var canvas, ctx, data;
      try {
        canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, cw, ch);
        data = ctx.getImageData(0, 0, cw, ch).data;
      } catch (e) {
        return;
      }
      var baseFrac = 1 - (0.5 * W) / H;
      var y0 = Math.max(0, Math.floor((baseFrac - 31 / H) * ch));
      var y1 = Math.min(ch - 1, Math.ceil((baseFrac - 10 / H) * ch));
      var lum = 0;
      var count = 0;
      for (var y = y0; y <= y1; y++) {
        for (var x = 0; x < cw; x++) {
          var i = (y * cw + x) * 4;
          if (data[i + 3] < 160) continue;
          lum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          count++;
        }
      }
      if (!count) return;
      lum /= count;
      caption.classList.toggle("cap-dark", lum > 0.5);
      caption.classList.toggle("cap-light", lum <= 0.5);
    }
    if (image.complete && image.naturalWidth) sample();
    image.addEventListener("load", sample);
    image.addEventListener("error", sample);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(sample);
  }

  function renderCards() {
    var grid = byId("cards");
    var cards = PROFILE.cards || [];
    if (!cards.length) {
      grid.appendChild(el("p", "empty", "暂无卡面数据，编辑 data.js 添加。"));
      return;
    }
    cards.forEach(function (card) {
      var item = el("article", "card-item");
      var media = el("div", "card-media");
      var image = makeImage(card.image, card.name, "card-img", false, "card", true);
      applyCardClip(media, image);
      media.appendChild(image);
      var caption = el("div", "card-caption", card.name);
      applyCaptionTone(media, image, caption);
      media.appendChild(caption);
      item.appendChild(media);

      grid.appendChild(item);
    });
  }

  function renderShowcase() {
    var grid = byId("showcase");
    var items = PROFILE.showcase || [];
    if (!items.length) {
      grid.appendChild(el("p", "empty", "橱窗还是空的，编辑 data.js 添加皮肤。"));
      return;
    }
    items.forEach(function (skin) {
      var card = el("article", "showcase-card");
      card.appendChild(makeImage(skin.image, skin.name, "showcase-img", false, "wide"));

      var info = el("div", "showcase-info");
      info.appendChild(el("span", "showcase-name", skin.name));
      info.appendChild(
        el("span", "showcase-meta", [skin.weapon, skin.rarity].filter(Boolean).join(" · "))
      );
      card.appendChild(info);

      grid.appendChild(card);
    });
  }

  function updateOverflowFades() {
    var nodes = document.querySelectorAll(".skin-name, .card-caption, .showcase-name");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      node.classList.toggle("is-faded", node.scrollWidth > node.clientWidth + 1);
    }
  }

  function render() {
    if (typeof PROFILE === "undefined") {
      byId("player-name").textContent = "缺少 data.js，请检查数据文件。";
      return;
    }
    renderHeader();
    renderAgents();
    renderFavoriteSkins();
    renderCards();
    renderShowcase();

    updateOverflowFades();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(updateOverflowFades);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateOverflowFades);
    window.addEventListener("resize", updateOverflowFades);
  }

  document.addEventListener("DOMContentLoaded", render);
})();
