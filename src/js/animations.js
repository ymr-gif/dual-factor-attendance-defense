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

        // Blast radius — three fronts leave the board as the parts lift. The
        // ring lies in its own local XY, so x and y here are the world x and z.
        // Positions are milliseconds (a bare number is absolute time on an
        // anime timeline), which is what spaces the fronts 150ms apart.
        // outQuart on the radius with a 200ms alpha spike and a long decay give
        // a front that leaves fast and dies as it goes, rather than a ring that
        // grows at a constant rate and pops out at the end.
        (view.shock || []).forEach((ring, i) => {
          const at = i * 150;
          tl.add(ring.scale, {
            x: [view.shockRest, 10.4],
            y: [view.shockRest, 10.4],
            duration: 1600,
            ease: 'outQuart',
          }, at)
          .add(ring.material, {
            opacity: [
              { to: 0.7, duration: 200, ease: 'outQuad' },
              { to: 0, duration: 1400, ease: 'inQuad' },
            ],
          }, at);
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
      //
      // Passing an explicit duration is what makes this land letter by letter:
      // without one, scrambleText sizes itself off revealRate (60 chars/sec) and
      // the whole word settles in ~420ms as a single event. With 2800ms and
      // from:'left' the eight glyphs lock in one at a time, left to right, at
      // half the speed the beat used to run.
      .add(main, {
        innerHTML: scrambleText({
          chars: 'A-Z0-9!@#$%',
          from: 'left',
          duration: 2800,
        }),
        opacity: [0, 1],
        y: [0, -300],
        duration: 2800,
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
    // The whole beat runs 1.25x; the two icons slide in at 2x on top of that,
    // so the convergence is over quickly and the sweep is what holds the room.
    const tl = createTimeline({ playbackRate: 1.25, defaults: { ease: 'outExpo' } });
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
      duration: 400,
    })
    .add(q(el, '.solution-icon--face'), {
      x: [100, 0],
      opacity: [0, 1],
      duration: 400,
    }, '<')
    // Rolled back by half of what it was, so the plus still lands on the same
    // fraction of the (now halved) slide-in rather than on top of its start.
    .add(q(el, '.solution-plus'), {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 400,
    }, '-=150')
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

  // Liveness — scan line sweeps, spoof is rejected; 3D phone spins in
  // simultaneously. The left scene's own scan-line + stamp are timed off
  // window.phone3D.timing so both halves' "verdict" beat — scan sweep,
  // then reject stamp — lands at the same moment as the phone's, instead
  // of the left side finishing its much shorter sequence 3-4s before the
  // phone even arrives.
  liveness(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    // Mount 3D phone and trigger entrance + scroll
    const phoneCanvas = q(el, '.phone-3d__canvas');
    let timing = null;
    if (phoneCanvas && window.phone3D && window.phone3D.supported()) {
      const phoneView = window.phone3D.mount(phoneCanvas);
      if (phoneView) {
        phoneView.start();
        phoneView.playEntrance();
        // No fade here — the container starts fully off-screen (see
        // playEntrance) and slides in over 4s. Fading opacity in on its own
        // much shorter timer made it pop fully visible mid-slide instead.
        utils.set(q(el, '.phone-3d'), { opacity: 1 });
        timing = window.phone3D.timing;
      }
    }

    // Photo icon and heading appear promptly so the left side doesn't sit
    // blank while the phone is still gliding in — only the scan-line sweep
    // and reject stamp (the shared "verdict" beat) wait for the sync point
    // below. Falls back to the original early timing when the phone isn't
    // rendered (no WebGL) so there's nothing to sync against.
    tl.add(q(el, '.liveness-photo'), {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
    }, 0)
    .add(q(el, '.liveness-title'), {
      opacity: [0, 1],
      y: [20, 0],
      duration: 500,
    }, 500)
    .add(q(el, '.liveness-subtitle'), {
      opacity: [0, 1],
      duration: 400,
    }, 800);

    const scanAt = timing ? timing.scanStart : 400;
    const scanDuration = timing ? (timing.scanEnd - timing.scanStart) : 1200;
    const stampAt = timing ? timing.stampStart : 1400;

    tl.add(q(el, '.liveness-scan-line'), {
      opacity: [0, 1, 1, 0],
      y: [0, 0, 180, 200],
      duration: scanDuration,
      ease: 'linear',
    }, scanAt)
    .add(q(el, '.liveness-stamp'), {
      opacity: [0, 1],
      scale: [2.5, 1],
      rotate: ['-30deg', -15],
      duration: 300,
      ease: 'outBack',
    }, stampAt);

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

  // Framework — IPO cards appear in turn, each landing with a small hop and
  // rattle. The wave below is an ambient spectrum meter: it never reacts to
  // the cards, it just keeps running.
  framework(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    const waveCanvas = q(el, '.ipo-wave');
    const stages = qa(el, '.ipo-stage');

    if (waveCanvas && waveCanvas.getContext) {
      const ctx = waveCanvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio, 2);
      let w, h;

      // .ipo-wave is a normal-flow block inside .ipo-block, which is
      // width: fit-content around .ipo — so the canvas's own rendered box
      // is *already* exactly as wide as the card row, by CSS alone. No
      // measuring card positions or setting an explicit left offset.
      function sizeCanvas() {
        w = waveCanvas.clientWidth;
        h = 18;
        waveCanvas.width = w * dpr;
        waveCanvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const BAR_PITCH = 4;
      const BAR_WIDTH = 2;
      const BAR_AMP = 6;   // tallest a bar reaches, in the 18px strip

      // Cheap deterministic hash, not a real PRNG — just enough so each
      // bar's idle jitter has its own phase/speed and the row never moves
      // in lockstep, the way a real spectrum visualizer never sits still.
      function hash(i) {
        const s = Math.sin(i * 12.9898) * 43758.5453;
        return s - Math.floor(s);
      }

      function drawWave(t) {
        ctx.clearRect(0, 0, w, h);
        const barCount = Math.floor(w / BAR_PITCH);

        for (let i = 0; i < barCount; i++) {
          const x = i * BAR_PITCH + BAR_WIDTH / 2;
          const phase = hash(i) * Math.PI * 2;
          const freq = 0.0018 + hash(i + 1) * 0.0012;
          const level = Math.abs(Math.sin(t * freq + phase));
          const height = Math.max(1, Math.min(h - 2, level * BAR_AMP));

          // A bar burns hotter the taller it is, the way a real meter peaks.
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineWidth = BAR_WIDTH;
          ctx.strokeStyle = `rgba(${Math.round(level * 130)}, ${Math.round(200 + level * 55)}, 255, ${0.3 + level * 0.55})`;
          ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
          ctx.shadowBlur = 2 + level * 4;
          ctx.moveTo(x, h);
          ctx.lineTo(x, h - height);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        waveCanvas._waveRaf = requestAnimationFrame(drawWave);
      }

      sizeCanvas();
      drawWave(performance.now());

      // framework() runs again on every visit to the slide, so drop the
      // previous visit's listener — it closes over a dead ctx/canvas state.
      if (waveCanvas._waveResize) {
        window.removeEventListener('resize', waveCanvas._waveResize);
      }
      waveCanvas._waveResize = sizeCanvas;
      window.addEventListener('resize', sizeCanvas);
    }

    // Entrance beats, at absolute millisecond positions. These are the same
    // times the previous relative ('-=X') chain resolved to — made explicit
    // so the wave beats below can be timed against them without drifting
    // whenever a duration changes.
    tl.add(q(el, '.framework-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    }, 0);

    // One unbroken motion per card: it fades in, rises, swells past its
    // resting size and settles. Previously the entrance decelerated to a
    // dead stop at y:0 and a *separate* pop tween then jerked it up again
    // — a visible kink in the middle of every card. Cards also overlap by
    // ~450ms now, so the row cascades instead of stepping one at a time.
    const CARD_AT = [400, 850, 1300];
    const CARD_MS = 900;

    // Plain value arrays only. The per-property `{ to: [...], ease }` form
    // silently keeps just the first two stops in this vendored anime build,
    // so a 3-stop scale ended stuck at its peak instead of settling back.
    CARD_AT.forEach((at, i) => {
      tl.add(stages[i], {
        opacity: [0, 1],
        y: [30, -3, 0],
        scale: [0.96, 1.06, 1],
        duration: CARD_MS,
        ease: 'inOutSine',
      }, at);
    });

    // Arrows bridge the cards, drawing while the next one is still rising.
    tl.add(q(el, '.ipo-arrow:nth-child(2)'), {
      opacity: [0, 1],
      scaleX: [0, 1],
      duration: 450,
    }, 1000)
    .add(q(el, '.ipo-arrow:nth-child(4)'), {
      opacity: [0, 1],
      scaleX: [0, 1],
      duration: 450,
    }, 1450)
    .add(q(el, '.ipo-feedback'), {
      opacity: [0, 1],
      scaleX: [0.6, 1],
      duration: 700,
    }, 1900);

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

  // Prototype — the guardpost rig assembles in one beat. The Arduino explode
  // that used to follow it was removed; slide 8 is the rig and nothing else.
  hardware(el) {
    const units = qa(el, '.unit');
    const wires = qa(el, '.wire');
    const caption = q(el, '.specs-caption');

    const rig = () => {
      // Every unit group carries .rig-context too — the marker the deleted
      // act-2 zoom used to dim the scene. Re-showing ".rig-context" here after
      // hiding ".unit" therefore un-hid the whole rig, so the slide opened on a
      // fully drawn board for the 250ms before the units tween started and then
      // snapped back to zero. Nothing dims the context any more, so the set is
      // gone; the units stay hidden until their own tween brings them in.
      utils.set(q(el, '.rig-stage'), { scale: 1, x: 0, y: 0 });
      utils.set(q(el, '.rig-svg'), { opacity: 1 });
      utils.set(units, { opacity: 0 });
      utils.set(wires, { opacity: 0 });
      utils.set(qa(el, '.rig-label'), { opacity: 0 });
      utils.set(q(el, '.specs-budget'), { opacity: 0 });
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
      .add(q(el, '.specs-budget'), {
        opacity: [0, 1],
        y: [12, 0],
        duration: 500,
      }, '-=400')
      .add(q(el, '.specs-caption'), {
        opacity: [0, 1],
        duration: 400,
      }, '-=300')
      .add(q(el, '.specs-stack'), {
        opacity: [0, 1],
        duration: 400,
      }, '-=250');

      return tl;
    };

    return rig();
  },

  // Research questions — shared by all three RQ slides
  rq(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    // Set track dot position based on slide number (9→0, 10→50, 11→100)
    const slideNum = parseInt(el.dataset.slide, 10);
    const dotOffset = (slideNum - 9) * 50;
    const dot = q(el, '.rq-track__dot');
    if (dot) dot.style.top = dotOffset + 'px';

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
    .add(q(el, '.rq-fields'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=200')
    .add(q(el, '.rq-track'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=300');

    return tl;
  },

  // Instruments — three cards stagger in
  instruments(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    // All trace lines in DOM order: h1, v1, h2, v2, h3, v3, h4, elbow
    const allTraceLines = qa(el,
      '.flow-flow .flow-trace__line, .flow-flow .flow-vtrace__line, .flow-flow .flow-elbow__line');
    const allVias = qa(el,
      '.flow-flow .flow-trace__via, .flow-flow .flow-vtrace__via, .flow-flow .flow-elbow__via');
    const traceContainers = [
      ...qa(el, '.flow-trace'),
      ...qa(el, '.flow-vtrace'),
      q(el, '.flow-elbow'),
    ];

    tl.add(q(el, '.instruments-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 300,
    })
    .add(qa(el, '.flow-node'), {
      opacity: [0, 1],
      y: [20, 0],
      scale: [0.85, 1],
      delay: stagger(60),
      duration: 250,
    }, '-=150')
    .add(allVias, {
      opacity: [0, 1],
      duration: 100,
    }, '-=150')
    .add(traceContainers, {
      opacity: [0, 1],
      duration: 100,
    }, '-=100')
    .add(allTraceLines, {
      opacity: [0, 1],
      delay: stagger(125),
      duration: 100,
    }, '-=50')
    .add(svg.createDrawable(allTraceLines), {
      draw: ['0 0', '0 1'],
      delay: stagger(125),
      duration: 150,
    }, '-=50')
    .add(qa(el, '.flow-callout'), {
      opacity: [0, 1],
      delay: stagger(200),
      duration: 400,
    }, '-=300');

    return tl;
  },

  // Protocols — two steps: cards enter, then details + outcomes reveal
  protocols(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.protocols-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(q(el, '.protocols-board'), {
      opacity: [0, 1],
      scale: [0.95, 1],
      duration: 600,
    }, '-=200')
    .add(q(el, '.protocol--1'), {
      opacity: [0, 1],
      x: [-50, 0],
      duration: 700,
    }, '-=300')
    .add(q(el, '.protocol--2'), {
      opacity: [0, 1],
      x: [50, 0],
      duration: 700,
    }, '-=500')
    .add(q(el, '.protocol--3'), {
      opacity: [0, 1],
      x: [50, 0],
      duration: 700,
    }, '-=500')
    .add(qa(el, '.protocol-divider'), {
      scaleY: [0, 1],
      opacity: [0, 0.3],
      delay: stagger(120),
      duration: 400,
    }, '-=400')
    .add(qa(el, '.protocol-details'), {
      opacity: [0, 1],
      y: [10, 0],
      duration: 500,
    }, '-=200')
    .add(q(el, '.protocols-outcome'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=200')
    .add(qa(el, '.protocols-metric'), {
      opacity: [0, 1],
      y: [12, 0],
      delay: stagger(100),
      duration: 400,
    }, '-=200');

    // Trigger dot-highlight scan animation after content settles
    const board = q(el, '.protocols-board');
    tl.add(board, {
      begin() { board.classList.add('is-scanning'); },
      duration: 0,
    }, '-=400');

    return tl;
  },

  // Survey — instrument structure, no result claims
  survey(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    const rows = qa(el, '.survey-trait-row');
    const segs = qa(el, '.survey-seg');

    tl.add(q(el, '.survey-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 625,
    })
    .add(q(el, '.survey-board'), {
      opacity: [0, 1],
      scale: [0.95, 1],
      duration: 750,
    }, '-=250')
    .add(qa(el, '.survey-col__label'), {
      opacity: [0, 1],
      duration: 500,
    }, '-=375')
    .add(rows, {
      opacity: [0, 1],
      y: [12, 0],
      delay: stagger(75),
      duration: 500,
    }, '-=250')
    .add(segs, {
      opacity: [0, 1],
      scaleX: [0, 1],
      delay: stagger(38),
      duration: 375,
      ease: 'outBack',
    }, '-=375')
    .add(qa(el, '.survey-trait-count'), {
      opacity: [0, 1],
      delay: stagger(75),
      duration: 375,
    }, '-=250')
    .add(qa(el, '.survey-col__total'), {
      opacity: [0, 1],
      duration: 375,
    }, '-=125')
    .add(q(el, '.survey-trace'), {
      opacity: [0, 1],
      duration: 500,
    }, '-=500');

    // Footnote
    tl.add(q(el, '.survey-footnote'), {
      opacity: [0, 1],
      duration: 500,
    }, '-=500');

    return tl;
  },

  // Scale — interpretation ladder builds from the bottom band up
  scale(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    const rows = qa(el, '.scale-row');
    const fills = qa(el, '.scale-row__fill');
    const target = q(el, '.scale-row[data-band="high"]');

    tl.add(q(el, '.scale-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(rows, {
      opacity: [0, 1],
      duration: 200,
      delay: stagger(80),
    }, '-=200')
    .add(fills, {
      scaleX: [0, 1],
      duration: 350,
      delay: stagger(300),
    }, '-=200')
    .add(qa(el, '.scale-row:not([data-band="high"])'), {
      y: [0, 22],
      duration: 400,
      delay: stagger(100),
      ease: 'outBack',
    }, '-=50')
    .add(target, {
      scale: [1, 1.04, 1],
      borderLeftWidth: ['3px', '5px'],
      duration: 400,
      ease: 'outBack',
      begin() { target.classList.add('scale-row--glow-loop'); },
    })
    .add(q(el, '.scale-footnote'), {
      opacity: [0, 1],
      duration: 400,
    }, '-=200');

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

  // Scroll transition between RQ slides (outgoing scrolls up, incoming scrolls in from below)
  rqScrollTransition(outEl, inEl, onDone) {
    const inScroll = q(inEl, '.rq-scroll');
    const outScroll = q(outEl, '.rq-scroll');

    // Make incoming slide content visible for the scroll
    utils.set(q(inEl, '.rq-eyebrow'), { opacity: 1 });
    utils.set(qa(inEl, '.rq-eyebrow__rule'), { scaleX: 1 });
    utils.set(q(inEl, '.rq-number'), { opacity: 1, scale: 1 });
    utils.set(q(inEl, '.rq-label'), { opacity: 1 });
    utils.set(q(inEl, '.rq-fields'), { opacity: 1 });

    // Set incoming track dot position and show both tracks
    const inSlideNum = parseInt(inEl.dataset.slide, 10);
    const inDot = q(inEl, '.rq-track__dot');
    if (inDot) inDot.style.top = ((inSlideNum - 9) * 50) + 'px';
    utils.set(q(inEl, '.rq-track'), { opacity: 1 });
    utils.set(q(outEl, '.rq-track'), { opacity: 1 });

    // Incoming starts below viewport, outgoing on top
    utils.set(inScroll, { y: 480 });
    outEl.style.zIndex = 2;

    const tl = createTimeline({
      defaults: { ease: 'outExpo' },
      onComplete() {
        outEl.style.zIndex = '';
        if (onDone) onDone();
      },
    });

    // Outgoing scrolls up and fades (track fades with it)
    tl.add(outScroll, {
      y: -480,
      opacity: [1, 0],
      duration: 600,
    }, 0)
    .add(q(outEl, '.rq-track'), {
      opacity: [1, 0],
      duration: 400,
    }, 0);

    // Incoming scrolls up from below with bounce
    tl.add(inScroll, {
      y: 0,
      duration: 700,
      ease: 'outBack',
    }, 0);
  },
};

window.slideAnimations = slideAnimations;
