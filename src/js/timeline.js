// Dispatches slide animations by data-anim name, not by index, so slides can be
// reordered or inserted without renumbering any animation code.
//
// An animation returns either a timeline (plays once on entry) or
// { steps: [fn, fn, ...] } — a slide the presenter advances through in beats,
// where the first step plays on entry and the rest fire on the next arrow press.
const masterTimeline = {
  timelines: {},
  stepped: {},
  currentSlide: null,

  init() {
    this.slides = document.querySelectorAll('.slide');
    this.totalSlides = this.slides.length;
  },

  playSlide(slideNum) {
    const slideEl = document.querySelector(`[data-slide="${slideNum}"]`);
    if (!slideEl) return;

    // Skip if already animated
    if (this.currentSlide === slideNum) return;
    this.currentSlide = slideNum;

    const animName = slideEl.dataset.anim;
    const fn = animName && slideAnimations[animName];

    if (typeof fn !== 'function') {
      if (animName) console.warn(`No animation registered for data-anim="${animName}"`);
      return;
    }

    const result = fn(slideEl);

    if (result && Array.isArray(result.steps)) {
      this.stepped[slideNum] = { fns: result.steps, index: 0, el: slideEl };
      result.steps[0](slideEl);
    } else {
      this.timelines[slideNum] = result;
    }
  },

  // Returns true when the press was consumed by a step, false to move on
  nextStep(slideNum) {
    const state = this.stepped[slideNum];
    if (!state || state.index >= state.fns.length - 1) return false;

    state.index += 1;
    state.fns[state.index](state.el);
    return true;
  },

  resetSlide(slideNum) {
    delete this.stepped[slideNum];
    if (this.currentSlide === slideNum) {
      this.currentSlide = null;
    }
  },

  resetAll() {
    this.currentSlide = null;
    this.stepped = {};
  },
};

window.masterTimeline = masterTimeline;
