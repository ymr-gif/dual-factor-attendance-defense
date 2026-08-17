const { animate, stagger, createTimeline, svg, utils, scrambleText } = anime;

const slideAnimations = {

  // Slide 1: Title — Scramble text + icon reveal
  slide1() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.shield-icon', {
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 800,
    })
    .add('.checkmark', {
      strokeDashoffset: [100, 0],
      duration: 600,
    }, '-=300')
    .add('.title-main', {
      innerHTML: scrambleText({ chars: 'A-Z0-9!@#$%' }),
      duration: 1200,
    }, '-=400')
    .add('.title-divider', {
      scaleX: [0, 1],
      duration: 600,
    }, '-=600')
    .add('.title-sub', {
      opacity: [0, 1],
      y: [15, 0],
      duration: 600,
    }, '-=300');

    return tl;
  },

  // Slide 2: Problem — Fingerprint + reject stamp
  slide2() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.fingerprint-icon circle', {
      scale: [0, 1],
      opacity: [0, 1],
      delay: stagger(100),
      duration: 600,
    })
    .add('.problem-title', {
      opacity: [0, 1],
      y: [20, 0],
      duration: 600,
    }, '-=200')
    .add('.problem-subtitle', {
      opacity: [0, 1],
      duration: 400,
    }, '-=300')
    .add('.reject-stamp', {
      opacity: [0, 1],
      scale: [3, 1],
      rotate: ['-30deg', '-15deg'],
      duration: 400,
      ease: 'outBack',
    }, '+=500');

    return tl;
  },

  // Slide 3: Solution — Icons converge
  slide3() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.solution-icon--nfc', {
      x: [-100, 0],
      opacity: [0, 1],
      duration: 800,
    })
    .add('.solution-icon--face', {
      x: [100, 0],
      opacity: [0, 1],
      duration: 800,
    }, '<')
    .add('.solution-plus', {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 400,
    }, '-=300')
    .add('.solution-result', {
      opacity: [0, 1],
      y: [20, 0],
      duration: 600,
    }, '+=300');

    return tl;
  },

  // Slide 4: Liveness — Scan line + reject
  slide4() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.liveness-photo', {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 600,
    })
    .add('.liveness-scan-line', {
      opacity: [0, 1, 1, 0],
      y: [0, 0, 180, 200],
      duration: 1200,
      ease: 'linear',
    }, '-=200')
    .add('.liveness-stamp', {
      opacity: [0, 1],
      scale: [2.5, 1],
      rotate: ['-30deg', -15],
      duration: 300,
      ease: 'outBack',
    }, '-=200')
    .add('.liveness-title', {
      opacity: [0, 1],
      y: [20, 0],
      duration: 500,
    }, '-=100')
    .add('.liveness-subtitle', {
      opacity: [0, 1],
      duration: 400,
    }, '-=200');

    return tl;
  },

  // Slide 5: Architecture — Nodes cascade + arrows draw
  slide5() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.arch-title', {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    });

    const nodes = document.querySelectorAll('.arch-node');
    const arrows = document.querySelectorAll('.arch-arrow');

    nodes.forEach((node, i) => {
      const pos = i * 300;
      tl.add(node, {
        opacity: [0, 1],
        y: [20, 0],
        duration: 400,
      }, `-=200`);
    });

    arrows.forEach((arrow, i) => {
      tl.add(arrow, {
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 300,
      }, '-=100');
    });

    return tl;
  },

  // Slide 6-8: Research Questions — Number bounce + data reveal
  rqSlide(slideEl) {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add(slideEl.querySelector('.rq-number'), {
      opacity: [0, 1],
      scale: [0.3, 1],
      duration: 800,
      ease: 'outElastic(1, 0.5)',
    })
    .add(slideEl.querySelector('.rq-icon'), {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 500,
    }, '-=400')
    .add(slideEl.querySelector('.rq-label'), {
      opacity: [0, 1],
      y: [15, 0],
      duration: 500,
    }, '-=200')
    .add(slideEl.querySelector('.rq-data'), {
      opacity: [0, 1],
      y: [15, 0],
      duration: 500,
    }, '-=200');

    return tl;
  },

  // Slide 9: Instruments — Cards stagger in
  slide9() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.instruments-title', {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add('.instrument-card', {
      opacity: [0, 1],
      y: [30, 0],
      delay: stagger(150),
      duration: 600,
    }, '-=200');

    return tl;
  },

  // Slide 10: Hardware Specs — Grid lights up
  slide10() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.specs-title', {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    })
    .add('.spec-card', {
      opacity: [0, 1],
      y: [20, 0],
      delay: stagger(100),
      duration: 400,
    }, '-=200');

    return tl;
  },

  // Slide 11: Protocols — Split entrance
  slide11() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.protocol--1', {
      opacity: [0, 1],
      x: [-50, 0],
      duration: 700,
    })
    .add('.protocol--2', {
      opacity: [0, 1],
      x: [50, 0],
      duration: 700,
    }, '-=500')
    .add('.protocol-divider', {
      scaleY: [0, 1],
      opacity: [0, 0.3],
      duration: 400,
    }, '-=300');

    return tl;
  },

  // Slide 12: Survey — Bars grow
  slide12() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.survey-title', {
      opacity: [0, 1],
      y: [-20, 0],
      duration: 500,
    });

    const bars = document.querySelectorAll('.survey-bar');
    const widths = ['85%', '70%', '40%', '20%', '10%'];

    bars.forEach((bar, i) => {
      const fill = bar.querySelector('.survey-bar__fill');
      tl.add(bar, {
        opacity: [0, 1],
        duration: 300,
      }, '-=200');
      tl.add(fill, {
        width: [0, widths[i]],
        duration: 600,
      }, '-=200');
    });

    tl.add('.survey-participants', {
      opacity: [0, 1],
      duration: 400,
    }, '-=200');

    return tl;
  },

  // Slide 13: Scale — Meter fills
  slide13() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.scale-fill', {
      width: ['0%', '80%'],
      duration: 1200,
    })
    .add('.scale-marker', {
      left: ['0%', '80%'],
      duration: 1200,
    }, '<')
    .add('.scale-label', {
      opacity: [0, 1],
      y: [10, 0],
      delay: stagger(200),
      duration: 400,
    }, '-=400');

    return tl;
  },

  // Slide 14: Acceptability — Ring fills
  slide14() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    const ring = document.querySelector('.accept-ring__progress');
    if (ring) {
      tl.add(ring, {
        strokeDashoffset: [534, 107],
        duration: 1500,
      });
    }

    tl.add('.accept-ring__value', {
      innerHTML: ['0%', '80%'],
      duration: 1500,
      ease: 'linear',
      modifier: (v) => Math.round(parseFloat(v)) + '%',
    }, '<');

    return tl;
  },

  // Slide 15: Thanks — Words scatter then reassemble
  slide15() {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl.add('.thanks-word', {
      opacity: [0, 1],
      y: [60, 0],
      delay: stagger(200),
      duration: 800,
    })
    .add('.thanks-sub', {
      opacity: [0, 1],
      y: [20, 0],
      duration: 600,
    }, '-=300');

    return tl;
  },
};

window.slideAnimations = slideAnimations;
