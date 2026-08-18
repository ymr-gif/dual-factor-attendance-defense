// Dispatches slide animations by data-anim name, not by index, so slides can be
// reordered or inserted without renumbering any animation code.
const masterTimeline = {
  timelines: {},
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

    if (typeof fn === 'function') {
      this.timelines[slideNum] = fn(slideEl);
    } else if (animName) {
      console.warn(`No animation registered for data-anim="${animName}"`);
    }
  },

  resetSlide(slideNum) {
    if (this.currentSlide === slideNum) {
      this.currentSlide = null;
    }
  },

  resetAll() {
    this.currentSlide = null;
  },
};

window.masterTimeline = masterTimeline;
