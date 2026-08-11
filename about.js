gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {

    // ─── Pin .about-visuals-wrapper over the timeline at Mobile Landscape and below ──────────
    // Desktop lays the visuals/timeline columns out side by side, so the CSS position:sticky
    // (top: 10rem) on .about-visuals-wrapper has room to work. At <=767px both .row.timeline's
    // columns collapse to 100% width and stack, leaving .about-visuals-wrapper's own parent
    // column no taller than the element itself — no room for CSS sticky to do anything.
    // ScrollTrigger's pin doesn't depend on parent height, so it pins the visuals at the same
    // top offset while the timeline column (pinSpacing:false) scrolls up underneath it.
    const visualsWrapper = document.querySelector('.about-visuals-wrapper');
    const timelineRow = document.querySelector('.row.timeline');
    const timelineCol = timelineRow ? timelineRow.querySelector('.col.u-text-center') : null;

    if (visualsWrapper && timelineCol) {
        const STACKED_MAX_WIDTH = 767; // Webflow's Mobile Landscape breakpoint, cascades down to Mobile Portrait too
        let pinTrigger;

        function setupVisualsPin() {
            if (pinTrigger) {
                pinTrigger.kill();
                pinTrigger = null;
                gsap.set(visualsWrapper, { clearProps: 'zIndex' });
            }

            if (window.innerWidth > STACKED_MAX_WIDTH) return;

            gsap.set(visualsWrapper, { zIndex: 10 });

            pinTrigger = ScrollTrigger.create({
                trigger: visualsWrapper,
                start: `top ${getComputedStyle(visualsWrapper).top}`, // matches the CSS top: 10rem offset
                endTrigger: timelineCol,
                end: 'bottom bottom',
                pin: true,
                pinSpacing: false,
            });
        }

        setupVisualsPin();

        let resizeTimer;
        let lastWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Mobile browsers fire resize on scroll-driven address-bar collapse/expand
                // (height-only change) — killing/recreating the pin on that caused a jump
                // mid-scroll. Only width changes are breakpoint-relevant here.
                if (window.innerWidth === lastWidth) return;
                lastWidth = window.innerWidth;
                setupVisualsPin();
            }, 150);
        });
    }

});

function initStepByStepTimeline() {
  const root = document.querySelector("[data-step-timeline-init]");
  if (!root) return;

  const line = root.querySelector("[data-step-timeline-line]");
  const fill = root.querySelector("[data-step-timeline-fill]");
  const items = Array.from(root.querySelectorAll("[data-step-timeline-item]"));
  if (!line || !fill || !items.length) return;

  const anchors = items.map(
    (item) => item.querySelector("[data-step-timeline-marker]") || item
  );

  const STACKED_MAX_WIDTH = 767; // Webflow's Mobile Landscape breakpoint, cascades down to Mobile Portrait too

  const activationInput = parseFloat(root.dataset.stepTimelineActivation);
  const activationOverride = Number.isNaN(activationInput)
    ? null
    : Math.min(Math.max(activationInput, 0), 1);

  // Desktop/tablet keep the original middle-of-viewport activation; at Mobile Landscape and
  // below, items activate once their top is within 10% of the viewport bottom instead
  // (0% = viewport top, 100% = bottom). A data-step-timeline-activation override wins at every breakpoint.
  function getActivationPercent() {
    if (activationOverride !== null) return activationOverride * 100;
    return (window.innerWidth <= STACKED_MAX_WIDTH ? 0.9 : 0.5) * 100;
  }

  const lastIndex = items.length - 1;

  let anchorFractions = [0];

  function measureLine() {
    if (items.length < 2) {
      line.style.height = "0px";
      anchorFractions = [0];
      return;
    }
    const base = line.parentElement.getBoundingClientRect().top;
    const centers = anchors.map((anchor) => {
      const box = anchor.getBoundingClientRect();
      return box.top + box.height / 2 - base;
    });
    const firstCenter = centers[0];
    const span = centers[lastIndex] - firstCenter;
    line.style.top = firstCenter + "px";
    line.style.height = span + "px";
    anchorFractions = centers.map((center) =>
      span > 0 ? (center - firstCenter) / span : 0
    );
  }

  let currentIndex = -2;

  function setCurrentIndex(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    items.forEach((item, i) => {
      const status = index >= 0 && i <= index ? "active" : "inactive";
      if (item.getAttribute("data-status") !== status) {
        item.setAttribute("data-status", status);
      }
      item.toggleAttribute("data-current", i === index);
      item.toggleAttribute("data-previous", i === index - 1);
      item.toggleAttribute("data-next", i === index + 1);
    });
    // Lets the interactive collage (about.js) mirror whichever step just became current —
    // its .interactive-collage__item.is--N classes are 1-indexed, this index is 0-indexed.
    document.dispatchEvent(new CustomEvent("step-timeline:current-change", { detail: { index } }));
  }

  function indexForProgress(reached, progress) {
    if (!reached) return -1;
    let index = 0;
    for (let i = 0; i < anchorFractions.length; i++) {
      if (progress + 0.0001 >= anchorFractions[i]) index = i;
    }
    return index;
  }

  function updateFromScroll(self) {
    const reached = self.isActive || self.progress >= 1;
    setCurrentIndex(indexForProgress(reached, self.progress));
  }

  setCurrentIndex(-1);
  gsap.set(fill, { transformOrigin: "top", scaleY: 0 });

  if (root._stepTimelineMedia) root._stepTimelineMedia.revert();
  const mediaQueries = gsap.matchMedia();
  root._stepTimelineMedia = mediaQueries;

  mediaQueries.add("(prefers-reduced-motion: no-preference)", () => {
    measureLine();
    ScrollTrigger.addEventListener("refreshInit", measureLine);

    if (items.length > 1) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: line,
            start: () => "top " + getActivationPercent() + "%",
            end: () => "bottom " + getActivationPercent() + "%",
            scrub: true,
            onUpdate: updateFromScroll,
            onToggle: updateFromScroll,
            onRefresh: updateFromScroll,
          },
        }
      );
    } else {
      setCurrentIndex(0);
    }

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener("load", refresh);
      ScrollTrigger.removeEventListener("refreshInit", measureLine);
    };
  });

  mediaQueries.add("(prefers-reduced-motion: reduce)", () => {
    measureLine();
    gsap.set(fill, { scaleY: 1 });
    setCurrentIndex(lastIndex);
  });
}

// Initialize Step-by-tep Timeline
document.addEventListener("DOMContentLoaded", () => {
  initStepByStepTimeline();
});


gsap.registerPlugin(CustomEase);
CustomEase.create("move", "0.3, 0.075, 0, 1");

function initCollageFocusCardOnHover() {
  const activeScale = 1.075;
  const inactiveScale = 0.9;
  const gapPercent = 3;
  const secondCardBoost = 1.35;
  const centerPullPercent = 25;
  const duration = 0.8;
  const ease = "move";

  document.querySelectorAll('[data-interactive-collage-init]').forEach(root => {
    root._interactiveCollageAbort?.abort();

    const list = root.querySelector('[data-interactive-collage-list]');
    const items = [...root.querySelectorAll('[data-interactive-collage-item]')];
    const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!list || !items.length) return;

    const controller = new AbortController();
    const { signal } = controller;
    let activeItem = null;
    const getInner = item => item.querySelector('[data-interactive-collage-item-inner]');

    const getMoveStrength = distance => {
      const strength = 1 / (1 + Math.pow(distance - 1, 1.2) * 0.45);
      return distance === 2 ? strength * secondCardBoost : strength;
    };

    const animateItem = (item, xPercent, yPercent, scale) => {
      gsap.to(getInner(item), {
        xPercent,
        yPercent,
        scale,
        duration,
        ease,
        overwrite: true
      });
    };

    const resetCollage = () => {
      activeItem = null;

      items.forEach(item => {
        item.removeAttribute('data-interactive-collage-focus');
        animateItem(item, 0, 0, 1);
      });
    };

    const focusItem = active => {
      if (activeItem === active) return;

      activeItem = active;

      items.forEach(item => {
        if (item === active) {
          item.setAttribute('data-interactive-collage-focus', '');
        } else {
          item.removeAttribute('data-interactive-collage-focus');
        }
      });

      const listRect = list.getBoundingClientRect();
      const listCenterY = listRect.top + listRect.height / 2;
      const gap = listRect.width * gapPercent / 100;

      const orderedItems = [...items].sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();

        return aRect.left + aRect.width / 2 - (bRect.left + bRect.width / 2);
      });

      const activeIndex = orderedItems.indexOf(active);
      const activeRect = active.getBoundingClientRect();
      const activeCenterX = activeRect.left + activeRect.width / 2;
      const activeLeft = activeCenterX - activeRect.width * activeScale / 2;
      const activeRight = activeCenterX + activeRect.width * activeScale / 2;

      const leftItem = orderedItems[activeIndex - 1];
      const rightItem = orderedItems[activeIndex + 1];

      let leftMove = 0;
      let rightMove = 0;

      if (leftItem) {
        const rect = leftItem.getBoundingClientRect();
        const itemRight = rect.left + rect.width / 2 + rect.width * inactiveScale / 2;

        leftMove = Math.min(0, activeLeft - gap - itemRight);
      }

      if (rightItem) {
        const rect = rightItem.getBoundingClientRect();
        const itemLeft = rect.left + rect.width / 2 - rect.width * inactiveScale / 2;

        rightMove = Math.max(0, activeRight + gap - itemLeft);
      }

      orderedItems.forEach((item, index) => {
        if (item === active) {
          animateItem(item, 0, 0, activeScale);
          return;
        }

        const rect = item.getBoundingClientRect();
        const difference = index - activeIndex;
        const distance = Math.abs(difference);
        const strength = getMoveStrength(distance);
        const itemCenterY = rect.top + rect.height / 2;
        const centerProgress = (listCenterY - itemCenterY) / (listRect.height / 2);
        const moveX = difference < 0 ? leftMove * strength : rightMove * strength;
        const scale = inactiveScale - (1 - strength) * 0.12;

        animateItem(item, moveX / rect.width * 100, centerPullPercent * centerProgress * strength, scale);
      });
    };

    const getHoveredItem = event => {
      if (activeItem) {
        const rect = getInner(activeItem).getBoundingClientRect();

        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          return activeItem;
        }
      }

      return document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-interactive-collage-item]') || null;
    };

    // True only while the mouse is actually over one of the images — real hover always wins
    // over the step-timeline sync below, which only applies while this is false.
    let isPointerHovering = false;

    if (isTouch) {
      items.forEach(item => {
        item.addEventListener('click', event => {
          event.stopPropagation();
          activeItem === item ? resetCollage() : focusItem(item);
        }, { signal });
      });

      document.addEventListener('click', event => {
        if (!root.contains(event.target)) resetCollage();
      }, { signal });
    } else {
      root.addEventListener('pointermove', event => {
        const item = getHoveredItem(event);
        isPointerHovering = !!item;
        item ? focusItem(item) : resetCollage();
      }, { signal });

      root.addEventListener('pointerleave', () => {
        isPointerHovering = false;
        resetCollage();
      }, { signal });
    }

    // Mirrors the step-timeline's current step (about.js's initStepByStepTimeline) as though
    // that image were hovered, without touching real hover behavior above.
    document.addEventListener('step-timeline:current-change', event => {
      if (isPointerHovering) return;

      const { index } = event.detail;
      const matchedItem = index >= 0 ? items.find(item => item.classList.contains('is--' + (index + 1))) : null;

      matchedItem ? focusItem(matchedItem) : resetCollage();
    }, { signal });

    root._interactiveCollageAbort = controller;
  });
}

// Initialize Collage Focus Card on Hover
document.addEventListener('DOMContentLoaded', () => {
  initCollageFocusCardOnHover();
});