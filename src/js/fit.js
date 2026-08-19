// Scales each slide's content box down until it fits the viewport.
//
// A CSS-only fit is not possible here: scale() takes a <number>, and there is no
// way to turn a viewport length into one — calc(100vw / 900) is still a length,
// so such a declaration is simply dropped. So the factor is measured instead.
//
// offsetWidth / offsetHeight report *layout* size and ignore transforms, so a
// slide's natural box stays readable no matter what scale is currently applied.
// That also means measuring is idempotent — no need to unset the transform first.
(function () {
  'use strict';

  function fitSlide(section) {
    const content = section.querySelector('.slide__content');
    if (!content) return;

    // Per-slide zoom lives on the section as data-fit-max; the default of 1
    // makes this a no-op for any slide that already fits.
    const max = parseFloat(section.dataset.fitMax || '1');
    const pad = parseFloat(section.dataset.fitPad || '0');

    const w = content.offsetWidth;
    const h = content.offsetHeight;
    if (!w || !h) return;

    const scale = Math.min(
      max,
      (window.innerWidth - pad) / w,
      (window.innerHeight - pad) / h
    );

    // Written to the <section>, not to .slide__content: masterTimeline.reset()
    // strips [style] from every *descendant* of the slide, but not the slide
    // itself, so the factor survives every slide reset.
    section.style.setProperty('--slide-scale', scale);
  }

  function fitAll() {
    document.querySelectorAll('.slide').forEach(fitSlide);
  }

  let raf = null;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      fitAll();
    });
  }

  window.slideFit = { fitAll, schedule };

  window.addEventListener('resize', schedule);
  document.addEventListener('fullscreenchange', schedule);

  // Metrics shift once the real faces land, so re-measure then.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  fitAll();
})();
