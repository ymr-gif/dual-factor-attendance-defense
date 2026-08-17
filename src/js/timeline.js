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

    // Run the appropriate animation
    const animKey = `slide${slideNum}`;
    const rqKey = slideNum >= 6 && slideNum <= 8 ? 'rqSlide' : null;

    if (slideNum >= 6 && slideNum <= 8) {
      slideAnimations.rqSlide(slideEl);
    } else if (slideAnimations[animKey]) {
      slideAnimations[animKey]();
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
