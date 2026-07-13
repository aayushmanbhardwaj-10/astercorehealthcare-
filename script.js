/* ==========================================================================
   ASTERCORE HEALTHCARE — script.js
   Loader, countdown, particle/DNA canvas, scroll reveal, stat counters,
   tech panel simulation, card tilt, typing effect, smooth nav, ambient
   mouse lighting, and an easter egg.
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ *
   * Shared small helpers
   * ------------------------------------------------------------------ */

  function pad(n, len) {
    n = String(Math.max(0, n));
    while (n.length < (len || 2)) n = "0" + n;
    return n;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /** Runs fn on rAF at most once per frame, regardless of call frequency. */
  function rafThrottle(fn) {
    var ticking = false;
    return function () {
      var args = arguments;
      var ctx = this;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          fn.apply(ctx, args);
          ticking = false;
        });
      }
    };
  }

  /* ================================================================== *
   * 1. PREMIUM LOADING EXPERIENCE
   * ================================================================== */

  var Loader = (function () {
    var el = document.getElementById("loader");
    var msgEl = document.getElementById("loader-message");
    var barEl = document.getElementById("loader-bar");
    var pctEl = document.getElementById("loader-percent");

    var steps = [
      { at: 0, text: "Initializing Healthcare Intelligence..." },
      { at: 22, text: "Connecting Research Networks..." },
      { at: 45, text: "Loading Diagnostic Systems..." },
      { at: 68, text: "Preparing Future Technologies..." },
      { at: 88, text: "Launching Astercore Healthcare..." }
    ];

    function setMessage(progress) {
      var current = steps[0].text;
      for (var i = 0; i < steps.length; i++) {
        if (progress >= steps[i].at) current = steps[i].text;
      }
      if (msgEl.textContent !== current) {
        msgEl.style.opacity = "0";
        setTimeout(function () {
          msgEl.textContent = current;
          msgEl.style.opacity = "1";
        }, 140);
      }
    }

    function run(onDone) {
      if (!el) { onDone && onDone(); return; }

      if (reduceMotion) {
        el.classList.add("loader-hidden");
        onDone && onDone();
        return;
      }

      var duration = 2600;
      var start = null;

      function frame(ts) {
        if (!start) start = ts;
        var elapsed = ts - start;
        var progress = clamp((elapsed / duration) * 100, 0, 100);

        barEl.style.width = progress + "%";
        pctEl.textContent = Math.floor(progress) + "%";
        setMessage(progress);

        if (progress < 100) {
          requestAnimationFrame(frame);
        } else {
          setTimeout(function () {
            el.classList.add("loader-hidden");
            document.body.style.overflow = "";
            onDone && onDone();
          }, 280);
        }
      }

      document.body.style.overflow = "hidden";
      requestAnimationFrame(frame);
    }

    return { run: run };
  })();

  /* ================================================================== *
   * 2. LIVE COUNTDOWN TIMER
   * ================================================================== */

  var Countdown = (function () {
    var launchDate = new Date("2035-01-01T00:00:00Z").getTime();
    var els = {
      years: document.getElementById("cd-years"),
      days: document.getElementById("cd-days"),
      hours: document.getElementById("cd-hours"),
      mins: document.getElementById("cd-mins"),
      secs: document.getElementById("cd-secs")
    };
    var completeEl = document.getElementById("countdown-complete");
    var countdownEl = document.getElementById("countdown");
    var noteEl = document.getElementById("hero-note");
    var timer = null;
    var finished = false;

    function tick(el, value) {
      if (!el) return;
      if (el.textContent === value) return;
      el.textContent = value;
      if (!reduceMotion && "animate" in el) {
        el.animate(
          [
            { transform: "translateY(-6px)", opacity: 0.3 },
            { transform: "translateY(0)", opacity: 1 }
          ],
          { duration: 320, easing: "cubic-bezier(.2,.7,.3,1)" }
        );
      }
    }

    function launchConfetti() {
      if (reduceMotion) return;
      var colors = ["#2563EB", "#06B6D4", "#14B8A6", "#22C55E"];
      for (var i = 0; i < 60; i++) {
        var piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[i % colors.length];
        piece.style.animationDuration = 2.4 + Math.random() * 1.6 + "s";
        piece.style.opacity = String(0.7 + Math.random() * 0.3);
        document.body.appendChild(piece);
        (function (p) {
          setTimeout(function () { p.remove(); }, 4200);
        })(piece);
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      if (countdownEl) countdownEl.style.display = "none";
      if (noteEl) noteEl.style.display = "none";
      if (completeEl) completeEl.classList.add("show");
      launchConfetti();
    }

    function update() {
      var diff = launchDate - Date.now();
      if (diff <= 0) { finish(); return; }

      var sec = Math.floor(diff / 1000);
      var years = Math.floor(sec / (365 * 24 * 3600));
      sec -= years * 365 * 24 * 3600;
      var days = Math.floor(sec / (24 * 3600));
      sec -= days * 24 * 3600;
      var hours = Math.floor(sec / 3600);
      sec -= hours * 3600;
      var mins = Math.floor(sec / 60);
      sec -= mins * 60;

      tick(els.years, pad(years, 2));
      tick(els.days, pad(days, 3));
      tick(els.hours, pad(hours, 2));
      tick(els.mins, pad(mins, 2));
      tick(els.secs, pad(sec, 2));
    }

    function start() {
      update();
      timer = setInterval(update, 1000);
    }

    return { start: start };
  })();

  /* ================================================================== *
   * 3 & 4. MOLECULAR PARTICLE SYSTEM + DNA HELIX (hero canvas)
   * ================================================================== */

  var HeroCanvas = (function () {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas) return { start: function () {}, boost: function () {} };

    var ctx = canvas.getContext("2d");
    var W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var boosted = false;
    var boostUntil = 0;
    var mouse = { x: -9999, y: -9999, active: false };

    function resize() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildParticles();
      buildHelices();
    }

    var particles = [];
    function buildParticles() {
      var count = W < 700 ? 24 : 44;
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.6 + 1.2
        });
      }
    }

    var helices = [];
    function buildHelices() {
      var count = W < 700 ? 1 : 2;
      helices = [];
      for (var h = 0; h < count; h++) {
        helices.push({
          cx: W * (h === 0 ? 0.82 : 0.14),
          amp: W < 700 ? 46 : 64,
          speed: 0.00035 + h * 0.0001,
          len: H * 1.25,
          rungs: 22
        });
      }
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(rafThrottle(resize)).observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize);
    }
    window.addEventListener("orientationchange", resize);
    window.addEventListener("load", resize);

    canvas.parentElement.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }, { passive: true });

    canvas.parentElement.addEventListener("mouseleave", function () {
      mouse.active = false;
    }, { passive: true });

    function drawHelix(helix, time) {
      var ampMul = boosted ? 1.35 : 1;
      var speedMul = boosted ? 2.2 : 1;
      var steps = helix.rungs;
      var top = -80;
      for (var s = 0; s <= steps; s++) {
        var progress = s / steps;
        var y = top + progress * helix.len;
        var phase = progress * Math.PI * 4 + time * helix.speed * 1000 * speedMul;
        var x1 = helix.cx + Math.sin(phase) * helix.amp * ampMul;
        var x2 = helix.cx + Math.sin(phase + Math.PI) * helix.amp * ampMul;
        var z1 = Math.cos(phase);
        var z2 = Math.cos(phase + Math.PI);

        ctx.strokeStyle = "rgba(37,99,235," + (0.10 + 0.06 * Math.abs(z1)) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        var r1 = 2.6 + z1 * 1.2;
        var r2 = 2.6 + z2 * 1.2;

        ctx.beginPath();
        ctx.fillStyle = "rgba(20,184,166," + (0.35 + 0.35 * Math.max(z1, 0)) + ")";
        ctx.arc(x1, y, Math.max(r1, 1), 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "rgba(6,182,212," + (0.30 + 0.35 * Math.max(z2, 0)) + ")";
        ctx.arc(x2, y, Math.max(r2, 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawParticles() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // subtle repulsion from the cursor
        if (mouse.active) {
          var dx = p.x - mouse.x;
          var dy = p.y - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90 && dist > 0.001) {
            var force = (90 - dist) / 90 * 0.06;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
      }

      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var ddx = particles[a].x - particles[b].x;
          var ddy = particles[a].y - particles[b].y;
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 130) {
            ctx.strokeStyle = "rgba(15,23,42," + (0.06 * (1 - d / 130)) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }

      for (var i2 = 0; i2 < particles.length; i2++) {
        var p2 = particles[i2];
        ctx.beginPath();
        ctx.fillStyle = boosted ? "rgba(34,197,94,0.5)" : "rgba(37,99,235,0.35)";
        ctx.arc(p2.x, p2.y, p2.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(now) {
      if (boosted && now > boostUntil) boosted = false;
      ctx.clearRect(0, 0, W, H);
      drawParticles();
      for (var h = 0; h < helices.length; h++) drawHelix(helices[h], now);
      if (!reduceMotion) requestAnimationFrame(frame);
    }

    function start() {
      resize();
      if (reduceMotion) {
        frame(0);
      } else {
        requestAnimationFrame(frame);
      }
    }

    function boost(ms) {
      boosted = true;
      boostUntil = performance.now() + (ms || 5000);
    }

    return { start: start, boost: boost };
  })();

  /* ================================================================== *
   * 5. SCROLL REVEAL ENGINE
   * ================================================================== */

  var ScrollReveal = (function () {
    function start() {
      var revealEls = document.querySelectorAll(".reveal");
      if (!("IntersectionObserver" in window) || reduceMotion) {
        revealEls.forEach(function (el) { el.classList.add("in"); });
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 6. STATISTICS COUNTER ANIMATION
   * ================================================================== */

  var StatsCounter = (function () {
    function animate(el) {
      var target = parseInt(el.getAttribute("data-target"), 10) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) {
        el.textContent = target + suffix;
        return;
      }
      var duration = 1700;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(step);
    }

    function start() {
      var statEls = document.querySelectorAll(".stat-num");
      if (!("IntersectionObserver" in window)) {
        statEls.forEach(animate);
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animate(entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      statEls.forEach(function (el) { io.observe(el); });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 7. TECHNOLOGY PANEL SIMULATION
   * ================================================================== */

  var TechPanels = (function () {
    function cycleStatus(el) {
      var messages = (el.getAttribute("data-messages") || "").split("|").filter(Boolean);
      if (messages.length < 2) return;
      var index = 0;
      setInterval(function () {
        index = (index + 1) % messages.length;
        if (reduceMotion) {
          el.textContent = messages[index];
          return;
        }
        el.style.transition = "opacity .3s ease";
        el.style.opacity = "0";
        setTimeout(function () {
          el.textContent = messages[index];
          el.style.opacity = "1";
        }, 300);
      }, 4200 + Math.random() * 1200);
    }

    function animateBars(panel) {
      if (reduceMotion) return;
      var bars = panel.querySelectorAll(".bars i");
      setInterval(function () {
        bars.forEach(function (bar) {
          var h = 30 + Math.random() * 60;
          bar.style.height = h + "%";
        });
      }, 2800 + Math.random() * 800);
    }

    function start() {
      document.querySelectorAll(".panel [data-status]").forEach(function (el) {
        cycleStatus(el);
      });
      document.querySelectorAll(".panel").forEach(function (panel) {
        animateBars(panel);
      });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 8. INTERACTIVE CARD TILT
   * ================================================================== */

  var CardTilt = (function () {
    var MAX_TILT = 6;

    function attach(el) {
      el.addEventListener(
        "mousemove",
        rafThrottle(function (e) {
          if (reduceMotion) return;
          var rect = el.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width;
          var py = (e.clientY - rect.top) / rect.height;
          var rotateY = (px - 0.5) * MAX_TILT * 2;
          var rotateX = (0.5 - py) * MAX_TILT * 2;
          el.style.transform =
            "translateY(-6px) perspective(800px) rotateX(" +
            rotateX.toFixed(2) +
            "deg) rotateY(" +
            rotateY.toFixed(2) +
            "deg)";
        }),
        { passive: true }
      );
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    }

    function start() {
      if (reduceMotion) return;
      document
        .querySelectorAll(".card, .division, .panel, .stat-card")
        .forEach(attach);
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 9. TYPING ANIMATION
   * ================================================================== */

  var TypingEffect = (function () {
    var messages = [
      "Advancing Human Health",
      "Building Medical Intelligence",
      "Precision Medicine for Everyone",
      "Transforming Healthcare Systems",
      "Engineering a Healthier Tomorrow"
    ];

    function start() {
      var el = document.getElementById("typing-text");
      if (!el) return;

      if (reduceMotion) {
        el.textContent = messages[messages.length - 1];
        return;
      }

      var msgIndex = 0;
      var charIndex = 0;
      var deleting = false;

      function step() {
        var current = messages[msgIndex];

        if (!deleting) {
          charIndex++;
          el.textContent = current.slice(0, charIndex);
          if (charIndex === current.length) {
            deleting = true;
            setTimeout(step, 1800);
            return;
          }
          setTimeout(step, 55 + Math.random() * 40);
        } else {
          charIndex--;
          el.textContent = current.slice(0, charIndex);
          if (charIndex === 0) {
            deleting = false;
            msgIndex = (msgIndex + 1) % messages.length;
            setTimeout(step, 400);
            return;
          }
          setTimeout(step, 28);
        }
      }

      setTimeout(step, 1200);
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 10. SMOOTH NAVIGATION + ACTIVE SECTION HIGHLIGHTING
   * ================================================================== */

  var NavHighlight = (function () {
    function start() {
      var links = document.querySelectorAll("[data-nav-link]");
      var sections = [];
      links.forEach(function (link) {
        var id = link.getAttribute("href").replace("#", "");
        var section = document.getElementById(id);
        if (section) sections.push({ link: link, section: section });
      });
      if (!sections.length || !("IntersectionObserver" in window)) return;

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var match = sections.find(function (s) { return s.section === entry.target; });
            if (!match) return;
            if (entry.isIntersecting) {
              links.forEach(function (l) { l.classList.remove("active"); });
              match.link.classList.add("active");
            }
          });
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      sections.forEach(function (s) { io.observe(s.section); });

      // Close the mobile menu after choosing a section
      links.forEach(function (link) {
        link.addEventListener("click", function () {
          var navLinks = document.getElementById("nav-links");
          if (navLinks && window.innerWidth <= 860) {
            navLinks.style.display = "none";
          }
        });
      });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 11. AMBIENT MOUSE LIGHTING
   * ================================================================== */

  var MouseGlow = (function () {
    function start() {
      var glow = document.getElementById("mouse-glow");
      if (!glow || reduceMotion || window.innerWidth <= 860) return;

      var move = rafThrottle(function (e) {
        glow.style.transform =
          "translate(" + e.clientX + "px," + e.clientY + "px) translate(-50%,-50%)";
        if (!glow.classList.contains("active")) glow.classList.add("active");
      });

      document.addEventListener("mousemove", move, { passive: true });
      document.addEventListener("mouseleave", function () {
        glow.classList.remove("active");
      });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * 12. EASTER EGG — type "HEALTHCARE"
   * ================================================================== */

  var EasterEgg = (function () {
    var target = "HEALTHCARE";
    var buffer = "";
    var toast = document.getElementById("easter-toast");
    var toastTimer = null;

    function showToast(text) {
      if (!toast) return;
      toast.textContent = text;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove("show");
      }, 4200);
    }

    function trigger() {
      document.body.classList.add("easter-active");
      HeroCanvas.boost(6000);
      showToast("Welcome to the Future of Healthcare.");
      setTimeout(function () {
        document.body.classList.remove("easter-active");
      }, 6000);
    }

    function start() {
      window.addEventListener("keydown", function (e) {
        if (e.key.length !== 1) return;
        buffer = (buffer + e.key).slice(-target.length).toUpperCase();
        if (buffer === target) {
          trigger();
          buffer = "";
        }
      });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * NEWSLETTER FORM
   * ================================================================== */

  var Newsletter = (function () {
    // Paste the URL from your Apps Script deployment (ends in /exec) below.
    var SHEET_ENDPOINT = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

    function start() {
      var form = document.getElementById("newsletter-form");
      var confirmMsg = document.getElementById("newsletter-confirm");
      var emailInput = document.getElementById("newsletter-email");
      var submitBtn = form ? form.querySelector("button[type='submit']") : null;
      if (!form) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = emailInput ? emailInput.value.trim() : "";
        if (!email) return;

        if (SHEET_ENDPOINT.indexOf("YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") !== -1) {
          console.warn("Newsletter: set SHEET_ENDPOINT in script.js to your Apps Script URL.");
          if (confirmMsg) confirmMsg.style.display = "block";
          form.reset();
          return;
        }

        if (submitBtn) submitBtn.disabled = true;

        fetch(SHEET_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "email=" + encodeURIComponent(email)
        })
          .then(function () {
            if (confirmMsg) confirmMsg.style.display = "block";
            form.reset();
          })
          .catch(function (err) {
            console.error("Newsletter submission failed:", err);
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * MOBILE NAV TOGGLE
   * ================================================================== */

  var MobileNav = (function () {
    function start() {
      var toggle = document.querySelector(".nav-toggle");
      var links = document.getElementById("nav-links");
      if (!toggle || !links) return;
      toggle.addEventListener("click", function () {
        var open = links.style.display === "flex";
        links.style.display = open ? "none" : "flex";
        links.style.position = "absolute";
        links.style.top = "78px";
        links.style.left = "0";
        links.style.right = "0";
        links.style.background = "#fff";
        links.style.flexDirection = "column";
        links.style.padding = "20px 24px";
        links.style.gap = "18px";
        links.style.borderBottom = "1px solid rgba(15,23,42,0.08)";
        toggle.setAttribute("aria-expanded", String(!open));
      });
    }
    return { start: start };
  })();

  /* ================================================================== *
   * BOOT SEQUENCE
   * ================================================================== */

  function initSite() {
    Countdown.start();
    HeroCanvas.start();
    ScrollReveal.start();
    StatsCounter.start();
    TechPanels.start();
    CardTilt.start();
    TypingEffect.start();
    NavHighlight.start();
    MouseGlow.start();
    EasterEgg.start();
    Newsletter.start();
    MobileNav.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      Loader.run(initSite);
    });
  } else {
    Loader.run(initSite);
  }
})();
