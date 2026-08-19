const { animate, stagger, createTimeline, svg, utils, scrambleText } = anime;

// Every animation is keyed by the slide's data-anim value and receives that
// slide element. Queries are scoped to the slide so a name can repeat (see rq).
const q = (el, sel) => el.querySelector(sel);
const qa = (el, sel) => Array.from(el.querySelectorAll(sel));

const slideAnimations = {

  // Title — two steps: "Proposal Defense" first, then full title + 3D board
  title(el) {
    let view = null;

    // Step 1 — "Proposal Defense", school name, assembled 3D board (no S.A.F.E.)
    const step1 = () => {
      const intro = q(el, '.title-intro');
      const school = q(el, '.title-school');
      const main = q(el, '.title-main');
      const rest = q(el, '.title-rest');
      const board3d = q(el, '.title-board-3d');
      utils.set(intro, { opacity: 0 });
      utils.set(school, { opacity: 0 });
      main.innerHTML = 'S.A.F.E.';
      utils.set(main, { opacity: 0 });
      utils.set(rest, { opacity: 0 });
      utils.set(board3d, { opacity: 0 });

      // Mount 3D view if available
      const can3D = board3d && window.hardware3D && window.hardware3D.supported();
      if (can3D) {
        view = window.hardware3D.mount(q(el, '.title-board-3d__canvas'));
        view.assemble();
        view.start();
      }

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(intro, {
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 700,
      })
      .add(school, {
        opacity: [0, 1],
        y: [-10, 0],
        duration: 350,
      }, '-=500')
      .add(board3d, {
        opacity: can3D ? [0, 1] : 0,
        duration: 500,
      }, '-=400');

      return tl;
    };

    // Step 2 — all motion happens simultaneously from t=0
    const step2 = () => {
      const intro = q(el, '.title-intro');
      const school = q(el, '.title-school');
      const main = q(el, '.title-main');
      const rest = q(el, '.title-rest');

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      // 3D board explosion — staggered from t=0
      if (view) {
        const risers = Object.keys(view.parts).filter((name) => view.riseFor(name) > 0);
        risers.forEach((name, i) => {
          tl.add(view.parts[name].position, {
            y: view.rest[name] + view.riseFor(name),
            duration: 1400,
            ease: 'outQuint',
          }, i * 0.09);
        });
      }

      // Proposal Defense — shrinks up
      tl.add(intro, {
        y: [0, -180],
        scale: [1, 0.4],
        opacity: [1, 0],
        duration: 1000,
      }, 0)

      // School name — shifts up
      .add(school, {
        y: [0, -130],
        opacity: [1, 0],
        duration: 1000,
      }, 0)

      // Rest container — slides down from way below, ends below center
      .add(rest, {
        y: [0, 120],
        opacity: [0, 1],
        duration: 1200,
      }, 0.3)
      .add(q(el, '.title-divider'), {
        scaleX: [0, 1],
        duration: 800,
      }, 0.5)
      .add(q(el, '.title-full'), {
        opacity: [0, 1],
        duration: 800,
      }, 0.7)
      .add(qa(el, '.title-team li'), {
        opacity: [0, 1],
        y: [20, 0],
        duration: 500,
      }, 0.9)
      .add(q(el, '.title-section'), {
        opacity: [0, 1],
        duration: 500,
      }, 1.4)

      // S.A.F.E. — last entry so if scrambleText breaks the chain nothing else is affected
      .add(main, {
        innerHTML: scrambleText({ chars: 'A-Z0-9!@#$%' }),
        opacity: [0, 1],
        y: [0, -300],
        duration: 1400,
      }, 0.1);

      return tl;
    };

    return { steps: [step1, step2] };
  },

  // Problem — three beats on the presenter's press: a week of the sheet fills
  // in by hand, a tick appears in a box that was blank, and the whole record
  // is stamped. The slot is 1:15; one timeline cannot hold it.
  problem(el) {
    const page = q(el, '.logbook-page');
    const margin = q(el, '.logbook-margin');
    const heads = qa(el, '.logbook-head');
    const headRule = q(el, '.logbook-rule--head');
    const rules = qa(el, '.logbook-rule:not(.logbook-rule--head)');
    const names = qa(el, '.entry .stroke--name');
    const boxes = qa(el, '.mark-box');
    const checks = qa(el, '.entry .mark-check');
    const lates = qa(el, '.mark-late');
    const forged = q(el, '.mark-check--forged');
    const cellFlag = q(el, '.cell-flag');
    const markFlag = q(el, '.mark-flag');
    const tell = q(el, '.logbook-tell');
    const stamp = q(el, '.reject-stamp');

    let fillTl = null;

    // A half-drawn path keeps the dash values createDrawable wrote. Clearing
    // them is how an interrupted beat gets handed over fully inked.
    const inked = (paths) => utils.set(paths, { strokeDasharray: 'none', strokeDashoffset: 0 });

    // Step 1 — the week fills in: names, boxes, ticks, two lates, two blanks
    const fill = () => {
      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(page, {
        opacity: [0, 1],
        scale: [0.94, 1],
        duration: 700,
      })
      .add(margin, {
        opacity: [0, 0.4],
        duration: 400,
      }, '-=350')
      .add(headRule, {
        opacity: [0, 0.55],
        scaleX: [0, 1],
        duration: 500,
      }, '-=300')
      .add(heads, {
        opacity: [0, 0.55],
        delay: stagger(60),
        duration: 400,
      }, '-=350')
      .add(rules, {
        opacity: [0, 0.45],
        scaleX: [0, 1],
        delay: stagger(70),
        duration: 450,
      }, '-=300')
      .add(names, {
        opacity: [0, 0.85],
        delay: stagger(90),
        duration: 200,
      }, '-=200')
      .add(svg.createDrawable(names), {
        draw: ['0 0', '0 1'],
        delay: stagger(90),
        duration: 620,
        ease: 'inOutQuad',
      }, '<')
      .add(boxes, {
        opacity: [0, 0.65],
        scale: [0.7, 1],
        delay: stagger(24),
        duration: 380,
      }, '-=450')
      .add(checks, {
        opacity: [0, 0.9],
        delay: stagger(45),
        duration: 160,
      }, '-=250')
      .add(svg.createDrawable(checks), {
        draw: ['0 0', '0 1'],
        delay: stagger(45),
        duration: 260,
        ease: 'outQuad',
      }, '<')
      .add(lates, {
        opacity: [0, 0.85],
        delay: stagger(120),
        duration: 300,
      }, '-=300');

      fillTl = tl;
      return tl;
    };

    // Steps 2+3 — forged tick + reject stamp, played as one continuous beat
    const forgeAndReject = () => {
      if (fillTl) fillTl.pause();
      utils.set(page, { opacity: 1, scale: 1 });
      utils.set(margin, { opacity: 0.4 });
      utils.set(headRule, { opacity: 0.55, scaleX: 1 });
      utils.set(heads, { opacity: 0.55 });
      utils.set(rules, { opacity: 0.45, scaleX: 1 });
      utils.set(names, { opacity: 0.85 });
      utils.set(boxes, { opacity: 0.65, scale: 1 });
      utils.set(checks, { opacity: 0.9 });
      utils.set(lates, { opacity: 0.85 });
      inked(names);
      inked(checks);

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      // Forge — tick lands in empty box
      tl.add(forged, {
        opacity: [0, 0.9],
        duration: 180,
      })
      .add(svg.createDrawable(forged), {
        draw: ['0 0', '0 1'],
        duration: 620,
        ease: 'outQuad',
      }, '<')
      .add(cellFlag, {
        opacity: [0, 0.9],
        scale: [1.5, 1],
        duration: 460,
      }, '+=260')
      .add(markFlag, {
        opacity: [0, 1],
        duration: 380,
      }, '-=300')
      .add(tell, {
        opacity: [0, 1],
        duration: 420,
      }, '-=200')

      // Reject — continuous after forge
      .add(stamp, {
        opacity: [0, 1],
        scale: [3, 1],
        rotate: [-26, -11],
        duration: 440,
        ease: 'outBack',
      }, '-=80')
      .add(q(el, '.problem-title'), {
        opacity: [0, 1],
        y: [20, 0],
        duration: 520,
      }, '-=120')
      .add(q(el, '.problem-subtitle'), {
        opacity: [0, 1],
        duration: 420,
      }, '-=220');

      return tl;
    };

    return { steps: [fill, forgeAndReject] };
  },

  // Solution — NFC and Face converge, the subject is scanned, then the verdict.
  // The scan is an overlay only: the model never moves, which keeps the beat
  // about the mechanism rather than about the character.
  solution(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    const dots = qa(el, '.scan__dot');
    const corners = qa(el, '.scan__corner');
    const line = q(el, '.scan__line');
    const GRID = [16, 19];
    const ROWS = GRID[1];
    const SWEEP = 2100;                      // line travel, top to bottom
    const STEP = Math.round(SWEEP / ROWS);   // one row per step, or the two drift
    const BAND = 600;                        // how long one row stays lit, rise to fall
    const DOTS_BLOCK = STEP * (ROWS - 1) + BAND;
    let vtuberView = null;

    tl.add(q(el, '.solution-icon--nfc'), {
      x: [-100, 0],
      opacity: [0, 1],
      duration: 800,
    })
    .add(q(el, '.solution-icon--face'), {
      x: [100, 0],
      opacity: [0, 1],
      duration: 800,
    }, '<')
    .add(q(el, '.solution-plus'), {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 400,
    }, '-=300')
    .add(q(el, '.vtuber-3d'), {
      opacity: [0, 1],
      duration: 800,
      begin() {
        const vtuberEl = q(el, '.vtuber-3d');
        const can3D = vtuberEl && window.vtuber3D && window.vtuber3D.supported();
        if (can3D) {
          vtuberView = window.vtuber3D.mount(q(el, '.vtuber-3d__canvas'));
          if (vtuberView) {
            vtuberView.resize();
            vtuberView.render();
            vtuberView.start();
          }
        }
      },
    }, '-=200')

    // Reticle locks on
    .add(corners, {
      opacity: [0, 0.9],
      scale: [1.25, 1],
      delay: stagger(80),
      duration: 420,
    }, '-=350')

    // The sweep, and the projector pattern lighting up row by row behind it.
    //
    // Offsets are all '-=' because '<' does NOT mean "start with previous" in
    // the vendored anime build — it appends, exactly like the default. Every
    // overlap here is therefore stated as an explicit rollback from the
    // timeline's current end. Reveal block = 18 rows x 74ms + 260ms = 1592ms.
    .add(line, {
      opacity: [0, 1],
      duration: 220,
    }, '-=80')
    .add(line, {
      top: ['0%', '100%'],
      duration: SWEEP,
      ease: 'linear',   // must match the linear row stagger or the two drift apart
    }, '-=220')

    // Each row lights as the line reaches it and goes dark again once the line
    // has moved on, so what travels down the portrait is a band of live points
    // tracking the beam rather than a pattern that fills in and stays.
    //
    // Rise and fall are one keyframed tween, not two adds. Two overlapping
    // tweens on the same property cancel each other — the fade-out was killing
    // the pending pop for every row the line had not reached yet.
    .add(dots, {
      opacity: [0, 1, 0],
      scale: [0.3, 1, 0.6],
      delay: stagger(STEP, { grid: GRID, axis: 'y', from: 'first' }),
      duration: BAND,
      ease: 'inOutQuad',
    }, `-=${SWEEP}`)
    .add(line, {
      opacity: 0,
      duration: 320,
    }, `-=${DOTS_BLOCK - SWEEP}`)
    .add(corners, {
      opacity: 0.35,
      duration: 420,
    }, '-=250')

    .add(q(el, '.solution-merge'), {
      opacity: [0, 1],
      scale: [0.6, 1],
      duration: 380,
    }, '-=120')
    .add(q(el, '.solution-result'), {
      opacity: [0, 1],
      y: [20, 0],
      duration: 600,
    }, '-=120');

    return tl;
  },

  // Liveness — scan line sweeps, spoof is rejected; 3D phone spins in simultaneously
  liveness(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    // Mount 3D phone and trigger entrance + scroll
    const phoneCanvas = q(el, '.phone-3d__canvas');
    if (phoneCanvas && window.phone3D && window.phone3D.supported()) {
      const phoneView = window.phone3D.mount(phoneCanvas);
      if (phoneView) {
        phoneView.start();
        phoneView.playEntrance();
        // No fade here — the container starts fully off-screen (see
        // playEntrance) and slides in over 4s. Fading opacity in on its own
        // much shorter timer made it pop fully visible mid-slide instead.
        utils.set(q(el, '.phone-3d'), { opacity: 1 });
      }
    }

    tl.add(q(el, '.liveness-photo'), {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
    }, 0)
    .add(q(el, '.liveness-scan-line'), {
      opacity: [0, 1, 1, 0],
      y: [0, 0, 180, 200],
      duration: 1200,
      ease: 'linear',
    }, '-=200')
    .add(q(el, '.liveness-stamp'), {
      opacity: [0, 1],
      scale: [2.5, 1],
      rotate: ['-30deg', -15],
      duration: 300,
      ease: 'outBack',
    }, '-=200')
    .add(q(el, '.liveness-title'), {
      opacity: [0, 1],
      y: [20, 0],
      duration: 500,
    }, '-=100')
    .add(q(el, '.liveness-subtitle'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=200');

    return tl;
  },

  // Notify — verified badge, traveling-wave dots with loading text,
  // green completion, then the guardian's phone inflates, vibrates with
  // radiating ripples, and receives a push notification.
  notify(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    const dots = qa(el, '.notify-dot');
    const statusProcessing = q(el, '.notify-status--processing');
    const statusSending = q(el, '.notify-status--sending');
    const statusAlmost = q(el, '.notify-status--almost');
    const statusComplete = q(el, '.notify-status--complete');
    const device = q(el, '.notify-device');
    const banner = q(el, '.notify-banner');
    const envelopes = qa(el, '.notify-envelope');
    const chips = qa(el, '.notify-chip');
    const corners = qa(el, '.notify-corner');

    // --- Title + Badge (0 – 0.8 s) ---
    tl.add(q(el, '.notify-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    }, 0)
    .add(q(el, '.notify-source'), {
      opacity: [0, 1],
      scale: [0.6, 1],
      duration: 500,
    }, 200);

    // --- Traveling wave — 3 cycles (0.8 s – 5.6 s) ---
    const WAVE_START = 800;
    const CYCLE_GAP = 1600;
    const DOT_STAGGER = 400;
    const DOT_DURATION = 800;
    const CYCLES = 3;

    for (let c = 0; c < CYCLES; c++) {
      const base = WAVE_START + c * CYCLE_GAP;
      for (let d = 0; d < dots.length; d++) {
        tl.add(dots[d], {
          opacity: [0.15, 1, 0.15],
          y: [0, -6, 0],
          duration: DOT_DURATION,
          ease: 'inOutSine',
        }, base + d * DOT_STAGGER);
      }
    }

    // --- Status text crossfade ---
    // "processing..." in at 0.8 s, out at 2.6 s
    tl.add(statusProcessing, {
      opacity: [0, 1],
      duration: 300,
    }, WAVE_START)
    .add(statusProcessing, {
      opacity: [1, 0],
      duration: 250,
    }, 2600)

    // "sending..." in at 2.8 s, out at 4.2 s
    .add(statusSending, {
      opacity: [0, 1],
      duration: 250,
    }, 2800)
    .add(statusSending, {
      opacity: [1, 0],
      duration: 250,
    }, 4200)

    // "almost there..." in at 4.4 s, out at 5.6 s
    .add(statusAlmost, {
      opacity: [0, 1],
      duration: 250,
    }, 4400)
    .add(statusAlmost, {
      opacity: [1, 0],
      duration: 250,
    }, 5600)

    // "Complete!" in at 5.8 s
    .add(statusComplete, {
      opacity: [0, 1],
      duration: 350,
    }, 5800);

    // --- Dots turn green + fill (5.8 s) ---
    tl.add(dots, {
      background: '#00ff88',
      opacity: 1,
      duration: 400,
      ease: 'outExpo',
    }, 5800);

    // --- Phone inflate (6.1 s) ---
    tl.add(device, {
      opacity: [0, 1],
      scale: [1, 1.2],
      duration: 300,
      ease: 'outBack',
    }, 6100);

    // --- Corners appear + phone vibrate (6.7 s) ---
    tl.add(corners, {
      opacity: [0, 1],
      duration: 150,
    }, 6700);

    // Phone wave — smooth rocking
    tl.add(device, {
      x: [0, -4, 4, -3, 3, -1, 0],
      rotate: [0, -2, 2, -1.5, 1.5, -0.5, 0],
      duration: 700,
      ease: 'inOutSine',
    }, 6700);

    // Corner burst — all 4 pulse together, then all echo outward together
    const ECHO_OFFSET = 300;

    corners.forEach((corner, idx) => {
      const dirRot = (idx % 2 === 0) ? 12 : -12;

      // All corners pulse in place simultaneously
      tl.add(corner, {
        scale: [1, 1.4, 1],
        rotate: [0, dirRot, 0],
        duration: 500,
        ease: 'inOutSine',
      }, 6700);
    });

    // All echoes travel outward simultaneously
    corners.forEach((corner, idx) => {
      const outX = (idx === 0 || idx === 2) ? -20 : 20;
      const outY = (idx < 2) ? -20 : 20;

      tl.add(corner, {
        x: [0, outX],
        y: [0, outY],
        scale: [1, 1.6],
        opacity: [1, 0],
        duration: 500,
        ease: 'outQuad',
      }, 6700 + ECHO_OFFSET);
    });

    // --- Corners fade out (7.1 s) ---
    tl.add(corners, {
      opacity: [1, 0],
      duration: 200,
    }, 7100);

    // --- Phone settle (7.1 s) ---
    tl.add(device, {
      scale: [1.2, 1],
      duration: 250,
    }, 7100);

    // --- Banner drops in (7.4 s) ---
    tl.add(banner, {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 350,
      ease: 'outBack',
    }, 7400);

    // --- Envelope + chips (7.6 s) ---
    tl.add(envelopes, {
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 350,
      ease: 'outBack',
    }, 7600)
    .add(chips, {
      opacity: [0, 1],
      y: [12, 0],
      delay: stagger(80),
      duration: 350,
    }, 7800);

    return tl;
  },

  // Framework — IPO cards appear sequentially, the waveform itself swells
  // upward toward whichever card is current (the canvas never moves)
  framework(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    const waveCanvas = q(el, '.ipo-wave');
    const stages = qa(el, '.ipo-stage');
    let waveOffset = 0;
    // Animated by the timeline below; drawWave() reads these live every
    // frame. The "wave" is a localized rise in the drawn line, not the
    // canvas being repositioned — a swell that glides under whichever card
    // is current and gives a little extra nudge on arrival.
    const waveState = { bumpX: 0, bumpAmount: 0 };

    // Helper: x-position of a card's center, in the canvas's local coord space
    function cardCenterX(i) {
      if (!waveCanvas || !stages[i]) return 0;
      const stageRect = stages[i].getBoundingClientRect();
      const canvasRect = waveCanvas.getBoundingClientRect();
      return stageRect.left + stageRect.width / 2 - canvasRect.left;
    }

    if (waveCanvas && waveCanvas.getContext) {
      const ctx = waveCanvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio, 2);
      let w, h;

      function sizeCanvas() {
        const rect = waveCanvas.parentElement.getBoundingClientRect();
        w = rect.width;
        h = 20;
        waveCanvas.width = w * dpr;
        waveCanvas.height = h * dpr;
        waveCanvas.style.width = w + 'px';
        waveCanvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Roughly a card's half-width, so the swell reads as a broad rise
      // under the whole card rather than a thin spike.
      const BUMP_SIGMA = 90;

      function waveY(x) {
        const mid = h / 2;
        const amp = 4;
        const freq = 0.05;
        const dx = x - waveState.bumpX;
        const bump = waveState.bumpAmount
          * Math.exp(-(dx * dx) / (2 * BUMP_SIGMA * BUMP_SIGMA));
        return mid + Math.sin(x * freq + waveOffset) * amp - bump;
      }

      function drawWave() {
        ctx.clearRect(0, 0, w, h);

        ctx.beginPath();
        ctx.strokeStyle = '#4a4a5e';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let x = 0; x < w; x++) {
          const y = waveY(x);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,212,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0,212,255,0.4)';
        ctx.shadowBlur = 6;
        ctx.setLineDash([]);
        for (let x = 0; x < w; x++) {
          const y = waveY(x);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        waveOffset += 0.03;
        waveCanvas._waveRaf = requestAnimationFrame(drawWave);
      }

      sizeCanvas();
      waveState.bumpX = cardCenterX(0);
      drawWave();
      window.addEventListener('resize', sizeCanvas);
    }

    // 1) Title
    tl.add(q(el, '.framework-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })

    // 2) Input card + wave nudges up beneath it
    .add(stages[0], {
      opacity: [0, 1],
      y: [30, 0],
      duration: 800,
    }, '-=100')
    .add(waveState, {
      bumpAmount: [0, 9],
      duration: 500,
      ease: 'outElastic(1, 0.5)',
    }, '-=600')

    // 3) Arrow 1
    .add(q(el, '.ipo-arrow:nth-child(2)'), {
      opacity: [0, 1],
      scaleX: [0, 1],
      duration: 400,
    }, '-=200')

    // 4) Process card + wave glides over and nudges
    .add(stages[1], {
      opacity: [0, 1],
      y: [30, 0],
      duration: 800,
    }, '-=100')
    .add(waveState, {
      bumpX: cardCenterX(1),
      duration: 500,
      ease: 'outExpo',
    }, '-=600')
    .add(waveState, {
      bumpAmount: [9, 13, 9],
      duration: 500,
      ease: 'outElastic(1, 0.5)',
    }, '-=500')

    // 5) Arrow 2
    .add(q(el, '.ipo-arrow:nth-child(4)'), {
      opacity: [0, 1],
      scaleX: [0, 1],
      duration: 400,
    }, '-=200')

    // 6) Output card + wave glides over and nudges
    .add(stages[2], {
      opacity: [0, 1],
      y: [30, 0],
      duration: 800,
    }, '-=100')
    .add(waveState, {
      bumpX: cardCenterX(2),
      duration: 500,
      ease: 'outExpo',
    }, '-=600')
    .add(waveState, {
      bumpAmount: [9, 13, 9],
      duration: 500,
      ease: 'outElastic(1, 0.5)',
    }, '-=500')

    // 7) Feedback bar
    .add(q(el, '.ipo-feedback'), {
      opacity: [0, 1],
      scaleX: [0.6, 1],
      duration: 600,
    }, '-=200');

    return tl;
  },

  // Architecture — nodes cascade, copper traces draw in between them, then
  // a packet pulse races along each trace once, left to right
  architecture(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    const traceLines = [1, 2, 3, 4, 5, 6]
      .map((n) => q(el, `.arch-trace--${n} .arch-trace__line`));
    const traceVias = qa(el, '.arch-trace__via');

    // --- Entrance cascade ---
    tl.add(q(el, '.arch-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 1000,
    })
    .add(qa(el, '.arch-node'), {
      opacity: [0, 1],
      y: [20, 0],
      scale: [0.85, 1],
      delay: stagger(320),
      duration: 900,
    }, '-=400')
    .add(traceVias, {
      opacity: [0, 1],
      duration: 400,
    }, 0)
    .add(traceLines, {
      opacity: [0, 1],
      delay: stagger(320),
      duration: 400,
    }, '-=300')
    .add(svg.createDrawable(traceLines), {
      draw: ['0 0', '0 1'],
      delay: stagger(320),
      duration: 600,
    }, '-=400');
    // Entrance settles ~3420ms in.

    // --- Packet flow pulse: one left-to-right pass, no loop ---
    // Nodes glow in sequence (same mechanic as before); traces carry the
    // light between them as a segment that travels the line's length via
    // a `draw` keyframe sweep, instead of flashing in place.
    const nodeIcons = [1, 2, 3, 4, 5, 6, 7]
      .map((n) => q(el, `.arch-node--${n} .arch-node__icon`));
    const tracePulses = [1, 2, 3, 4, 5, 6]
      .map((n) => q(el, `.arch-trace--${n} .arch-trace__pulse`));

    const PULSE_START = 4000;
    const STAGGER = 640;
    const NODE_DURATION = 840;
    const TRACE_DURATION = STAGGER;
    const TRACE_SEG = 0.14; // fraction of the line the traveling segment covers

    // Node 5 (Match + Liveness) reads as a pass, not a generic hop.
    // Node 7 (Notify Guardian) gets a bigger pop for "flies out."
    const NODE_PEAK_COLOR = { 5: '#00ff88' }; // var(--success)
    const NODE_PEAK_SCALE = { 7: 1.28 };

    nodeIcons.forEach((icon, i) => {
      const n = i + 1;
      tl.add(icon, {
        scale: [1, NODE_PEAK_SCALE[n] || 1.18, 1],
        background: ['#12121a', NODE_PEAK_COLOR[n] || '#00d4ff', '#12121a'], // var(--bg-secondary) -> peak -> var(--bg-secondary)
        color: ['#00d4ff', '#0a0a0f', '#00d4ff'], // var(--accent) -> var(--bg-primary) -> var(--accent)
        duration: NODE_DURATION,
        ease: 'inOutSine',
      }, PULSE_START + i * STAGGER);
    });

    tracePulses.forEach((pulse, i) => {
      tl.add(svg.createDrawable(pulse), {
        draw: ['0 0', `0 ${TRACE_SEG}`, `${1 - TRACE_SEG} 1`, '1 1'],
        opacity: [0, 1, 1, 0],
        duration: TRACE_DURATION,
        ease: 'inOutSine',
      }, PULSE_START + i * STAGGER);
    });

    // --- Scan line sweep: vertical line travels left→right with the pulse ---
    const scanLine = q(el, '.arch-scan');
    const SWEEP_DURATION = 4200;

    tl.add(scanLine, {
      opacity: [0, 1],
      duration: 150,
    }, PULSE_START)
    .add(scanLine, {
      left: ['0%', '100%'],
      duration: SWEEP_DURATION,
      ease: 'linear',
    }, PULSE_START)
    .add(scanLine, {
      opacity: 0,
      duration: 150,
    }, PULSE_START + SWEEP_DURATION);

    return tl;
  },

  // Prototype — two steps: the rig assembles, then the Arduino explodes.
  // Step 2 fires on the next arrow press (see timeline.js step handling).
  hardware(el) {
    const stage = q(el, '.rig-stage');
    const units = qa(el, '.unit');
    const parts = qa(el, '.part');
    const wires = qa(el, '.wire');
    const caption = q(el, '.specs-caption');
    const risers = parts.filter((p) => Number(p.dataset.rise) > 0);
    // everything that clears away when the camera pushes into the board
    const context = qa(el, '.rig-context');
    const stage3d = q(el, '.board-3d');
    const labels3d = qa(el, '.label3d');
    let rigTl = null;
    let view = null;   // the 3D board, built the first time it is needed

    // Step 1 — the guardpost rig drops in and the jumpers draw themselves
    const rig = () => {
      utils.set(stage, { scale: 1, x: 0, y: 0 });
      utils.set(parts, { y: 0 });
      utils.set(q(el, '.rig-svg'), { opacity: 1 });
      utils.set(stage3d, { opacity: 0 });
      utils.set(labels3d, { opacity: 0 });
      if (view) { view.stop(); view.assemble(); }
      utils.set(units, { opacity: 0 });
      utils.set(context, { opacity: 1 });
      utils.set(qa(el, '.part-label'), { opacity: 0 });
      utils.set(qa(el, '.rig-label'), { opacity: 0 });
      caption.textContent = 'Guardpost rig';

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(q(el, '.specs-title'), {
        opacity: [0, 1],
        y: [-20, 0],
        duration: 500,
      })
      .add(units, {
        opacity: [0, 1],
        y: [-40, 0],
        delay: stagger(140),
        duration: 700,
      }, '-=250')
      .add(wires, {
        opacity: [0, 0.9],
        duration: 200,
      }, '-=400')
      .add(svg.createDrawable(wires), {
        draw: ['0 0', '0 1'],
        duration: 900,
        ease: 'inOutQuad',
      }, '<')
      .add(qa(el, '.rig-label'), {
        opacity: [0, 1],
        delay: stagger(110),
        duration: 450,
      }, '-=500')
      .add(q(el, '.specs-caption'), {
        opacity: [0, 1],
        duration: 400,
      }, '-=300')
      .add(q(el, '.specs-stack'), {
        opacity: [0, 1],
        duration: 400,
      }, '-=250');

      rigTl = tl;
      return tl;
    };

    // Step 2 — everything else clears and the board comes apart. The 3D board
    // is the real thing; the isometric explode below stands in wherever WebGL
    // is unavailable, so the slide always has a second beat.
    const handoff = () => {
      // The presenter may hit step 2 before step 1 has settled. Stop that
      // timeline and jump to its end state, or its tweens finish after ours
      // and put the rig back.
      if (rigTl) rigTl.pause();
      utils.set(units, { opacity: 1, y: 0 });
      utils.set(wires, { opacity: 0.9 });
      utils.set(qa(el, '.rig-label'), { opacity: 1 });
      utils.set([q(el, '.specs-title'), caption, q(el, '.specs-stack')], { opacity: 1 });
      caption.textContent = 'Arduino · exploded';
    };

    // Labels sit in fixed callout columns either side of the board — the way a
    // product diagram does it — and only the leader line moves, re-aimed at the
    // part every frame while it travels.
    const trackLabels = () => {
      const box = q(el, '.board-3d').getBoundingClientRect();
      labels3d.forEach((label) => {
        const point = view.project(label.dataset.part);
        if (!point) {                       // model has no part by that name
          label.style.visibility = 'hidden';
          return;
        }
        label.style.visibility = '';

        const left = label.dataset.side === 'left';
        const x = box.width * (left ? 0.28 : 0.72);
        const y = box.height * (0.2 + Number(label.dataset.slot) * 0.19);
        label.style.transform = `translate(${x}px, ${y}px)`;

        const dx = point.x - x;
        const dy = point.y - y;
        label.querySelector('.label3d__leader').style.width = Math.hypot(dx, dy) + 'px';
        label.querySelector('.label3d__leader').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
        label.querySelector('.label3d__dot').style.transform = `translate(${dx}px, ${dy}px)`;
      });
    };

    const explode3D = () => {
      if (!view) {
        view = window.hardware3D.mount(q(el, '.board-3d__canvas'));
        view.onFrame = trackLabels;
      }
      view.resize();
      view.assemble();
      view.start();
      utils.set(labels3d, { opacity: 0 });
      trackLabels();

      const risers = Object.keys(view.parts).filter((name) => view.riseFor(name) > 0);

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(qa(el, '.rig-label'), { opacity: 0, duration: 300 })
        .add(context.concat([q(el, '.rig-svg')]), { opacity: 0, duration: 450 }, '-=200')
        .add(stage3d, { opacity: [0, 1], duration: 600 }, '-=250');

      risers.forEach((name, i) => {
        tl.add(view.parts[name].position, {
          y: view.rest[name] + view.riseFor(name),
          duration: 1400,
          ease: 'outQuint',
        }, i === 0 ? '-=300' : `-=${1400 - 90}`);
      });

      tl.add(labels3d, {
        opacity: [0, 1],
        delay: stagger(90),
        duration: 400,
      }, '-=500');

      return tl;
    };

    // Isometric fallback: same beat, no WebGL
    const explodeSVG = () => {
      const parts = qa(el, '.part');
      const risers = parts.filter((p) => Number(p.dataset.rise) > 0);
      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(qa(el, '.rig-label'), { opacity: 0, duration: 300 })
        .add(context, { opacity: 0, duration: 450 }, '-=200')
        .add(q(el, '.rig-stage'), {
          scale: 1.45,
          x: -54.1,
          y: -71.5,
          duration: 1100,
          ease: 'inOutQuad',
        }, '-=350')
        .add(risers, {
          y: (p) => -Number(p.dataset.rise),
          delay: stagger(70),
          duration: 900,
        }, '-=600')
        .add(qa(el, '.part-label'), {
          opacity: [0, 1],
          delay: stagger(90),
          duration: 400,
        }, '-=400');

      return tl;
    };

    const explode = () => {
      handoff();
      const can3D = stage3d && window.hardware3D && window.hardware3D.supported();
      return can3D ? explode3D() : explodeSVG();
    };

    return { steps: [rig, explode] };
  },

  // Research questions — shared by all three RQ slides
  rq(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.rq-eyebrow'), {
      opacity: [0, 1],
      y: [-12, 0],
      duration: 450,
    })
    .add(qa(el, '.rq-eyebrow__rule'), {
      scaleX: [0, 1],
      duration: 500,
    }, '-=250')
    .add(q(el, '.rq-number'), {
      opacity: [0, 1],
      scale: [0.3, 1],
      duration: 800,
      ease: 'outElastic(1, 0.5)',
    }, '-=250')
    .add(q(el, '.rq-label'), {
      opacity: [0, 1],
      y: [15, 0],
      duration: 500,
    }, '-=200')
    .add(q(el, '.rq-table'), {
      opacity: [0, 1],
      y: [15, 0],
      duration: 500,
    }, '-=200');

    return tl;
  },

  // Instruments — three cards stagger in
  instruments(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    const traceLines = [1, 2, 3, 4, 5, 6, 7, 8]
      .map((n) => q(el, `.flow-trace--${n} .flow-trace__line`));
    const traceVias = qa(el, '.flow-trace__via');

    tl.add(q(el, '.instruments-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 1000,
    })
    .add(qa(el, '.flow-node'), {
      opacity: [0, 1],
      y: [20, 0],
      scale: [0.85, 1],
      delay: stagger(280),
      duration: 900,
    }, '-=400')
    .add(traceVias, {
      opacity: [0, 1],
      duration: 400,
    }, 0)
    .add(traceLines, {
      opacity: [0, 1],
      delay: stagger(280),
      duration: 400,
    }, '-=300')
    .add(svg.createDrawable(traceLines), {
      draw: ['0 0', '0 1'],
      delay: stagger(280),
      duration: 600,
    }, '-=400');

    return tl;
  },

  // Protocols — two halves enter from opposite sides
  protocols(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.protocol--1'), {
      opacity: [0, 1],
      x: [-50, 0],
      duration: 700,
    })
    .add(q(el, '.protocol--2'), {
      opacity: [0, 1],
      x: [50, 0],
      duration: 700,
    }, '-=500')
    .add(q(el, '.protocol-divider'), {
      scaleY: [0, 1],
      opacity: [0, 0.3],
      duration: 400,
    }, '-=300');

    return tl;
  },

  // Survey — instrument structure, no result claims
  survey(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.survey-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(qa(el, '.survey-version'), {
      opacity: [0, 1],
      scale: [0.8, 1],
      delay: stagger(160),
      duration: 500,
    }, '-=200')
    .add(qa(el, '.survey-trait'), {
      opacity: [0, 1],
      y: [16, 0],
      delay: stagger(110),
      duration: 400,
    }, '-=200')
    .add(q(el, '.survey-participants'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=100');

    return tl;
  },

  // Scale — interpretation ladder builds from the bottom band up
  scale(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.scale-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(qa(el, '.scale-row'), {
      opacity: [0, 1],
      x: [-30, 0],
      delay: stagger(120, { from: 'last' }),
      duration: 450,
    }, '-=200')
    .add(q(el, '.scale-footnote'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=100');

    return tl;
  },

  // Scope — in-scope and out-of-scope columns split apart
  scope(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.scope-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(q(el, '.scope-col--in'), {
      opacity: [0, 1],
      x: [-40, 0],
      duration: 600,
    }, '-=200')
    .add(q(el, '.scope-col--out'), {
      opacity: [0, 1],
      x: [40, 0],
      duration: 600,
    }, '<')
    .add(q(el, '.scope-divider'), {
      scaleY: [0, 1],
      opacity: [0, 0.3],
      duration: 400,
    }, '-=400')
    .add(qa(el, '.scope-list li'), {
      opacity: [0, 1],
      y: [10, 0],
      delay: stagger(60),
      duration: 300,
    }, '-=300');

    return tl;
  },

  // Expected output — three deliverable cards
  output(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.output-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(qa(el, '.output-card'), {
      opacity: [0, 1],
      y: [30, 0],
      delay: stagger(180),
      duration: 600,
    }, '-=200')
    .add(q(el, '.output-note'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=100');

    return tl;
  },

  // Thanks — words rise into place
  thanks(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(qa(el, '.thanks-word'), {
      opacity: [0, 1],
      y: [60, 0],
      delay: stagger(200),
      duration: 800,
    })
    .add(q(el, '.thanks-sub'), {
      opacity: [0, 1],
      y: [20, 0],
      duration: 600,
    }, '-=300');

    return tl;
  },
};

window.slideAnimations = slideAnimations;
