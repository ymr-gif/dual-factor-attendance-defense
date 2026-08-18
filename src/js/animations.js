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
        duration: 1200,
      })
      .add(school, {
        opacity: [0, 1],
        y: [-10, 0],
        duration: 600,
      }, '-=800')
      .add(board3d, {
        opacity: can3D ? [0, 1] : 0,
        duration: 800,
      }, '-=600');

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

  // Problem — three beats on the presenter's press: the page fills by hand,
  // a fifth signature is forged in a hand already on the page, then the whole
  // log is rejected. The slot is 1:15; one timeline cannot hold it.
  problem(el) {
    const page = q(el, '.logbook-page');
    const margin = q(el, '.logbook-margin');
    const heads = qa(el, '.logbook-head');
    const headRule = q(el, '.logbook-rule--head');
    const rules = qa(el, '.logbook-rule:not(.logbook-rule--head)');
    const loggedTimes = qa(el, '.entry--logged .logbook-time');
    const loggedInk = qa(el, '.entry--logged .stroke');
    const forgedTime = q(el, '.entry--forged .logbook-time');
    const forgedInk = qa(el, '.entry--forged .stroke');
    const flags = qa(el, '.sig-flag');
    const bracket = q(el, '.logbook-bracket');
    const tell = q(el, '.logbook-tell');
    const stamp = q(el, '.reject-stamp');

    let fillTl = null;
    let forgeTl = null;

    // A half-drawn path keeps the dash values createDrawable wrote. Clearing
    // them is how an interrupted beat gets handed over fully inked.
    const inked = (paths) => utils.set(paths, { strokeDasharray: 'none', strokeDashoffset: 0 });

    // Step 1 — the page and four entries arrive, written by hand
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
        delay: stagger(70),
        duration: 400,
      }, '-=350')
      .add(rules, {
        opacity: [0, 0.45],
        scaleX: [0, 1],
        delay: stagger(70),
        duration: 450,
      }, '-=300')
      .add(loggedTimes, {
        opacity: [0, 0.75],
        delay: stagger(150),
        duration: 350,
      }, '-=150')
      .add(loggedInk, {
        opacity: [0, 0.85],
        delay: stagger(90),
        duration: 200,
      }, '-=350')
      .add(svg.createDrawable(loggedInk), {
        draw: ['0 0', '0 1'],
        delay: stagger(90),
        duration: 620,
        ease: 'inOutQuad',
      }, '<');

      fillTl = tl;
      return tl;
    };

    // Step 2 — the fifth row is written in a hand already on the page
    const forge = () => {
      if (fillTl) fillTl.pause();
      utils.set(page, { opacity: 1, scale: 1 });
      utils.set(margin, { opacity: 0.4 });
      utils.set(headRule, { opacity: 0.55, scaleX: 1 });
      utils.set(heads, { opacity: 0.55 });
      utils.set(rules, { opacity: 0.45, scaleX: 1 });
      utils.set(loggedTimes, { opacity: 0.75 });
      utils.set(loggedInk, { opacity: 0.85 });
      inked(loggedInk);

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(forgedTime, {
        opacity: [0, 0.75],
        duration: 320,
      })
      .add(forgedInk, {
        opacity: [0, 0.85],
        delay: stagger(140),
        duration: 220,
      }, '-=120')
      .add(svg.createDrawable(forgedInk), {
        draw: ['0 0', '0 1'],
        delay: stagger(140),
        duration: 760,
        ease: 'inOutQuad',
      }, '<')
      .add(flags, {
        opacity: [0, 1],
        duration: 420,
      }, '+=180')
      .add(bracket, {
        opacity: [0, 0.6],
        duration: 400,
      }, '-=250')
      .add(tell, {
        opacity: [0, 1],
        duration: 400,
      }, '-=250');

      forgeTl = tl;
      return tl;
    };

    // Step 3 — the log is worth nothing
    const reject = () => {
      if (forgeTl) forgeTl.pause();
      utils.set(forgedTime, { opacity: 0.75 });
      utils.set(forgedInk, { opacity: 0.85 });
      inked(forgedInk);
      utils.set(flags, { opacity: 1 });
      utils.set(bracket, { opacity: 0.6 });
      utils.set(tell, { opacity: 1 });

      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      tl.add(stamp, {
        opacity: [0, 1],
        scale: [3, 1],
        rotate: [-26, -11],
        duration: 440,
        ease: 'outBack',
      })
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

    return { steps: [fill, forge, reject] };
  },

  // Solution — NFC and Face converge into one verdict
  solution(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
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
    .add(q(el, '.solution-result'), {
      opacity: [0, 1],
      y: [20, 0],
      duration: 600,
    }, '+=300')
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
    }, '-=300');

    return tl;
  },

  // Liveness — scan line sweeps, spoof is rejected
  liveness(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.liveness-photo'), {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
    })
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

  // Notify — verified badge fires a trail to the guardian's phone
  notify(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.notify-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(q(el, '.notify-source'), {
      opacity: [0, 1],
      scale: [0.6, 1],
      duration: 600,
    }, '-=200')
    .add(qa(el, '.notify-dot'), {
      opacity: [0, 1],
      scale: [0, 1],
      delay: stagger(90),
      duration: 300,
    }, '-=200')
    .add(q(el, '.notify-device'), {
      opacity: [0, 1],
      x: [40, 0],
      duration: 600,
    }, '-=100')
    .add(qa(el, '.notify-envelope'), {
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 400,
      ease: 'outBack',
    }, '-=200')
    .add(qa(el, '.notify-chip'), {
      opacity: [0, 1],
      y: [12, 0],
      delay: stagger(100),
      duration: 400,
    }, '-=100');

    return tl;
  },

  // Framework — IPO stages build left to right, feedback loop closes
  framework(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.framework-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(qa(el, '.ipo-stage'), {
      opacity: [0, 1],
      y: [30, 0],
      delay: stagger(220),
      duration: 600,
    }, '-=200')
    .add(qa(el, '.ipo-arrow'), {
      opacity: [0, 1],
      scaleX: [0, 1],
      delay: stagger(220),
      duration: 400,
    }, '-=800')
    .add(qa(el, '.ipo-list li'), {
      opacity: [0, 1],
      x: [-10, 0],
      delay: stagger(50),
      duration: 300,
    }, '-=400')
    .add(q(el, '.ipo-feedback'), {
      opacity: [0, 1],
      scaleX: [0.6, 1],
      duration: 600,
    }, '-=200');

    return tl;
  },

  // Architecture — nodes cascade, arrows draw between them
  architecture(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.arch-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(qa(el, '.arch-node'), {
      opacity: [0, 1],
      y: [20, 0],
      scale: [0.85, 1],
      delay: stagger(160),
      duration: 450,
    }, '-=200')
    .add(qa(el, '.arch-arrow'), {
      opacity: [0, 1],
      scaleX: [0, 1],
      delay: stagger(160),
      duration: 300,
    }, '-=1100');

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
    .add(q(el, '.rq-icon'), {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 500,
    }, '-=400')
    .add(q(el, '.rq-label'), {
      opacity: [0, 1],
      y: [15, 0],
      duration: 500,
    }, '-=200')
    .add(q(el, '.rq-data'), {
      opacity: [0, 1],
      y: [15, 0],
      duration: 500,
    }, '-=200');

    return tl;
  },

  // Instruments — three cards stagger in
  instruments(el) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(q(el, '.instruments-title'), {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add(qa(el, '.instrument-card'), {
      opacity: [0, 1],
      y: [30, 0],
      delay: stagger(150),
      duration: 600,
    }, '-=200');

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
