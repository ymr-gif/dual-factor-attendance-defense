(function() {
  'use strict';

  let currentSlide = 1;
  let isAnimating = false;

  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  const progressFill = document.querySelector('.progress-bar__fill');
  const counterCurrent = document.querySelector('.slide-counter__current');
  const counterTotal = document.querySelector('.slide-counter__total');

  // Counter total is derived from the DOM — adding a slide needs no edit here
  if (counterTotal) counterTotal.textContent = totalSlides;

  function updateProgress() {
    const pct = (currentSlide / totalSlides) * 100;
    progressFill.style.width = pct + '%';
    counterCurrent.textContent = currentSlide;
  }

  function goToSlide(num) {
    if (num < 1 || num > totalSlides || isAnimating) return;
    if (num === currentSlide) return;

    isAnimating = true;

    // Hide current
    const currentEl = document.querySelector(`[data-slide="${currentSlide}"]`);
    if (currentEl) {
      currentEl.classList.remove('active');
    }

    currentSlide = num;

    // Show new
    const newEl = document.querySelector(`[data-slide="${currentSlide}"]`);
    if (newEl) {
      newEl.classList.add('active');
    }

    updateProgress();

    // Play animation after transition
    setTimeout(() => {
      masterTimeline.playSlide(currentSlide);
      isAnimating = false;
    }, 100);
  }

  function nextSlide() {
    if (currentSlide < totalSlides) {
      goToSlide(currentSlide + 1);
    }
  }

  function prevSlide() {
    if (currentSlide > 1) {
      goToSlide(currentSlide - 1);
    }
  }

  function restart() {
    goToSlide(1);
    masterTimeline.resetAll();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'r':
      case 'R':
        restart();
        break;
      case 'p':
      case 'P':
        // Pause — reserved for future use
        break;
    }
  });

  // Click to advance
  document.addEventListener('click', (e) => {
    // Don't advance if clicking on interactive elements
    if (e.target.closest('button, a, input')) return;
    nextSlide();
  });

  // Touch support
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  }, { passive: true });

  // Init
  updateProgress();
  masterTimeline.init();

  // Play first slide animation
  setTimeout(() => {
    masterTimeline.playSlide(1);
  }, 300);

})();
