console.log('how-we-work.js loaded');

gsap.registerPlugin(SplitText, ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {

    gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase);
    CustomEase.create("radial", "0.25, 0.1, 0, 1");
    
    function initRadialCardsSlider() {
      const slideDuration = 1;
      const clickEase = 'radial';
    
      document.querySelectorAll('[data-radial-slider-init]').forEach(container => {
        if (container._radialSliderDraggable) container._radialSliderDraggable.kill();
        if (container._radialSliderProxy) gsap.killTweensOf(container._radialSliderProxy);
        if (container._radialSliderProxyEl) container._radialSliderProxyEl.remove();
    
        const collection = container.querySelector('[data-radial-slider-collection]');
        const track = container.querySelector('[data-radial-slider-list]');
        if (!collection || !track) return;
    
        container.querySelectorAll('[data-radial-slider-clone]').forEach(el => el.remove());
    
        const originalItems = Array.from(container.querySelectorAll('[data-radial-slider-item]:not([data-radial-slider-clone])'));
        if (!originalItems.length) return;
    
        container.setAttribute('role', 'region');
        container.setAttribute('aria-roledescription', 'carousel');
        container.setAttribute('aria-label', container.getAttribute('aria-label') || 'Radial Cards Slider');
    
        track.setAttribute('role', 'group');
        track.setAttribute('aria-label', 'Slides');
    
        const dotsWrap = container.querySelector('[data-radial-slider-generate-dots]');
        if (dotsWrap) {
          const dots = Array.from(dotsWrap.querySelectorAll('[data-radial-slider-control]'));
    
          if (dots.length) {
            const firstDot = dots[0];
    
            dots.slice(1).forEach(dot => dot.remove());
    
            firstDot.setAttribute('data-radial-slider-control', '1');
            firstDot.setAttribute('data-radial-slider-control-status', 'not-active');
    
            for (let i = 2; i <= originalItems.length; i++) {
              const dot = firstDot.cloneNode(true);
    
              dot.setAttribute('data-radial-slider-control', String(i));
              dot.setAttribute('data-radial-slider-control-status', 'not-active');
    
              dotsWrap.appendChild(dot);
            }
          }
        }
    
        const controls = Array.from(container.querySelectorAll('[data-radial-slider-control]'));
        const totalEl = container.querySelector('[data-slider-index-total]');
        const indicators = Array.from(container.querySelectorAll('[data-slider-index-current]'));
    
        originalItems.forEach((item, index) => {
          item.removeAttribute('data-radial-slider-item-status');
          item.removeAttribute('aria-hidden');
          item.setAttribute('role', 'group');
          item.setAttribute('aria-label', `Slide ${index + 1} of ${originalItems.length}`);
        });
    
        controls.forEach(btn => {
          const value = btn.getAttribute('data-radial-slider-control');
    
          if (value === 'prev') btn.setAttribute('aria-label', 'Previous slide');
          if (value === 'next') btn.setAttribute('aria-label', 'Next slide');
    
          if (/^\d+$/.test(value)) {
            btn.setAttribute('aria-label', `Go to slide ${value}`);
            btn.setAttribute('aria-current', 'false');
          }
        });
    
        track.style.height = '';
    
        const setNumber = (el, value) => {
          if (!el) return;
          el.textContent = value < 10 ? '0' + value : String(value);
        };
    
        const mod = (value, total) => ((value % total) + total) % total;
    
        setNumber(totalEl, originalItems.length);
    
        const containerStyles = getComputedStyle(container);
        const rotateStep = Math.abs(parseFloat(containerStyles.getPropertyValue('--slider-rotate'))) || 18;
        const maxLoopItems = Math.max(1, Math.floor(360 / rotateStep));
    
        const firstRect = originalItems[0].getBoundingClientRect();
        const itemWidth = firstRect.width;
        const itemHeight = firstRect.height;
    
        const originParts = getComputedStyle(originalItems[0]).transformOrigin.split(' ');
        const originY = parseFloat(originParts[1]) || itemHeight * 3.75;
        const wheelRadius = Math.max(0, originY - itemHeight / 2);
        const proxyRadius = wheelRadius + Math.max(itemWidth, itemHeight) * 0.525;
    
        const getBoundsAtAngle = angle => {
          const rad = angle * Math.PI / 180;
    
          return {
            x: Math.sin(rad) * wheelRadius,
            y: originY - Math.cos(rad) * wheelRadius,
            halfWidth: Math.abs(Math.cos(rad)) * itemWidth / 2 + Math.abs(Math.sin(rad)) * itemHeight / 2,
            halfHeight: Math.abs(Math.sin(rad)) * itemWidth / 2 + Math.abs(Math.cos(rad)) * itemHeight / 2
          };
        };
    
        const isOffsetInsideContainer = offset => {
          const containerRect = container.getBoundingClientRect();
          const trackRect = track.getBoundingClientRect();
    
          const originX = trackRect.left + trackRect.width / 2;
          const originYTop = trackRect.top;
    
          const leftLimit = containerRect.left - originX;
          const rightLimit = containerRect.right - originX;
          const topLimit = containerRect.top - originYTop;
          const bottomLimit = containerRect.bottom - originYTop;
    
          const bounds = getBoundsAtAngle(offset * rotateStep);
    
          const cardLeft = bounds.x - bounds.halfWidth;
          const cardRight = bounds.x + bounds.halfWidth;
          const cardTop = bounds.y - bounds.halfHeight;
          const cardBottom = bounds.y + bounds.halfHeight;
    
          return cardRight >= leftLimit && cardLeft <= rightLimit && cardBottom >= topLimit && cardTop <= bottomLimit;
        };
    
        const getVisibleOffsets = () => {
          const offsets = [0];
          const maxSide = Math.ceil(maxLoopItems / 2);
    
          let leftEdge = 0;
          let rightEdge = 0;
    
          for (let i = 1; i <= maxSide; i++) {
            if (!isOffsetInsideContainer(i)) break;
            offsets.push(i);
            rightEdge = i;
          }
    
          for (let i = 1; i <= maxSide; i++) {
            if (!isOffsetInsideContainer(-i)) break;
            offsets.unshift(-i);
            leftEdge = -i;
          }
    
          const nextLeft = leftEdge - 1;
          const nextRight = rightEdge + 1;
    
          if (Math.abs(nextLeft) <= maxSide) offsets.unshift(nextLeft);
          if (Math.abs(nextRight) <= maxSide) offsets.push(nextRight);
    
          return offsets;
        };
    
        const visibleOffsets = getVisibleOffsets();
        const minItemsNeeded = Math.min(maxLoopItems, Math.max(originalItems.length, visibleOffsets.length));
        const neededItems = Math.ceil(minItemsNeeded / originalItems.length) * originalItems.length;
    
        const currentItems = Array.from(container.querySelectorAll('[data-radial-slider-item]:not([data-radial-slider-clone])'));
    
        for (let i = currentItems.length; i < neededItems; i++) {
          const clone = currentItems[i % currentItems.length].cloneNode(true);
    
          clone.setAttribute('data-radial-slider-clone', '');
          clone.setAttribute('aria-hidden', 'true');
    
          track.appendChild(clone);
        }
    
        const items = Array.from(track.querySelectorAll(':scope > [data-radial-slider-item]'));
        const totalItems = items.length;
    
        track.style.height = itemHeight + 'px';
    
        items.forEach(item => {
          item.setAttribute('data-radial-slider-item-status', 'not-active');
        });
    
        container.setAttribute('data-radial-slider-drag-status', 'grab');
    
        const containerRect = container.getBoundingClientRect();
        const collectionRect = collection.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
    
        const proxyWrap = document.createElement('div');
        proxyWrap.setAttribute('data-radial-slider-proxy-wrap', '');
    
        Object.assign(proxyWrap.style, {
          position: 'absolute',
          left: containerRect.left - collectionRect.left + 'px',
          top: containerRect.top - collectionRect.top + 'px',
          width: containerRect.width + 'px',
          height: containerRect.height + 'px',
          overflow: 'hidden',
          pointerEvents: 'none'
        });
    
        const proxy = document.createElement('div');
        proxy.setAttribute('data-radial-slider-proxy', '');
    
        Object.assign(proxy.style, {
          position: 'absolute',
          width: proxyRadius * 2 + 'px',
          height: proxyRadius * 2 + 'px',
          left: trackRect.left + trackRect.width / 2 - containerRect.left + 'px',
          top: trackRect.top - containerRect.top + originY - proxyRadius + 'px',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          pointerEvents: 'auto',
          opacity: '0'
        });
    
        proxyWrap.appendChild(proxy);
        collection.appendChild(proxyWrap);
    
        container._radialSliderProxy = proxy;
        container._radialSliderProxyEl = proxyWrap;
    
        const setRotation = items.map(item => gsap.quickSetter(item, 'rotation', 'deg'));
    
        gsap.set(proxy, { rotation: 0 });
    
        const getIndexFromProxy = () => -gsap.getProperty(proxy, 'rotation') / rotateStep;
    
        const nearestDelta = (index, realIndex, total) => {
          const loop = Math.round((realIndex - index) / total);
          return index - (realIndex - loop * total);
        };
    
        const nearestDeltaToSlideNumber = (targetNumber, realIndex) => {
          let bestDelta = 0;
          let bestDistance = Infinity;
    
          items.forEach((item, index) => {
            const slideNumber = index % originalItems.length;
    
            if (slideNumber !== targetNumber) return;
    
            const delta = nearestDelta(index, realIndex, totalItems);
            const distance = Math.abs(delta);
    
            if (distance < bestDistance) {
              bestDistance = distance;
              bestDelta = delta;
            }
          });
    
          return bestDelta;
        };
    
        let lastActiveIndex = null;
    
        const setIndicator = index => {
          const value = index + 1;
          const text = value < 10 ? '0' + value : String(value);
    
          indicators.forEach(el => {
            el.textContent = text;
          });
        };
    
        const updateControlStatus = activeIndex => {
          controls.forEach(btn => {
            const value = btn.getAttribute('data-radial-slider-control');
    
            if (!/^\d+$/.test(value)) return;
    
            const index = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
            const isActive = index === activeIndex;
    
            btn.setAttribute('data-radial-slider-control-status', isActive ? 'active' : 'not-active');
            btn.setAttribute('aria-current', isActive ? 'true' : 'false');
          });
        };
    
        const updateActiveUI = activeIndex => {
          if (activeIndex === lastActiveIndex) return;
    
          setIndicator(activeIndex);
          updateControlStatus(activeIndex);
          lastActiveIndex = activeIndex;
        };
    
        const render = () => {
          const realIndex = getIndexFromProxy();
          const activeIndex = mod(Math.round(realIndex), totalItems);
          const activeSlideIndex = activeIndex % originalItems.length;
    
          items.forEach((item, index) => {
            const rotation = nearestDelta(index, realIndex, totalItems) * rotateStep;
    
            item.setAttribute('data-radial-slider-item-status', index === activeIndex ? 'active' : 'inview');
            setRotation[index](rotation);
          });
    
          updateActiveUI(activeSlideIndex);
        };
    
        controls.forEach(btn => {
          btn.disabled = false;
    
          const value = btn.getAttribute('data-radial-slider-control');
    
          if (value === 'next' || value === 'prev') {
            btn.onclick = () => {
              gsap.killTweensOf(proxy);
    
              const currentIndex = getIndexFromProxy();
              const targetIndex = Math.round(currentIndex) + (value === 'next' ? 1 : -1);
    
              gsap.to(proxy, {
                rotation: -targetIndex * rotateStep,
                duration: slideDuration,
                ease: clickEase,
                onUpdate: render
              });
            };
          }
    
          if (/^\d+$/.test(value)) {
            const targetSlideNumber = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
    
            btn.onclick = () => {
              gsap.killTweensOf(proxy);
    
              const currentIndex = getIndexFromProxy();
              const delta = nearestDeltaToSlideNumber(targetSlideNumber, currentIndex);
    
              gsap.to(proxy, {
                rotation: -(currentIndex + delta) * rotateStep,
                duration: slideDuration,
                ease: clickEase,
                onUpdate: render
              });
            };
          }
        });
    
        container._radialSliderDraggable = Draggable.create(proxy, {
          type: 'rotation',
          trigger: [proxy, ...items],
          inertia: true,
          throwResistance: 2000,
          dragResistance: 0.05,
          maxDuration: 1,
          minDuration: 0.5,
          edgeResistance: 0.75,
          overshootTolerance: 0,
          snap: value => Math.round(value / rotateStep) * rotateStep,
          onDrag: render,
          onThrowUpdate: render,
          onThrowComplete: () => {
            container.setAttribute('data-radial-slider-drag-status', 'grab');
            render();
          },
          onPress: () => container.setAttribute('data-radial-slider-drag-status', 'grabbing'),
          onDragStart: () => container.setAttribute('data-radial-slider-drag-status', 'grabbing'),
          onRelease: () => container.setAttribute('data-radial-slider-drag-status', 'grab')
        })[0];
    
        render();
      });
    
      if (initRadialCardsSlider._resize) {
        window.removeEventListener('resize', initRadialCardsSlider._resize);
      }
    
      initRadialCardsSlider._resize = debounceOnWidthChange(initRadialCardsSlider, 200);
      window.addEventListener('resize', initRadialCardsSlider._resize);
    }
    
    function debounceOnWidthChange(fn, ms) {
      let lastWidth = window.innerWidth;
      let timer;
    
      return function (...args) {
        clearTimeout(timer);
    
        timer = setTimeout(() => {
          if (window.innerWidth === lastWidth) return;
    
          lastWidth = window.innerWidth;
          fn.apply(this, args);
        }, ms);
      };
    }
    
    // Initialize Radial Cards Slider (GSAP) — already inside the outer DOMContentLoaded above,
    // so this just calls it directly rather than registering a second listener for an event
    // that has necessarily already fired by this point.
    initRadialCardsSlider();

    // ─── Sticky-video service items: scroll-scrubbed SplitText reveal ───────────────────────
    // .section.sticky-video's height is set in CSS to one viewport-height per .video-featured-item,
    // so its scroll distance is the natural pacing source: divide the section's total scroll
    // range into one equal segment per item and reveal that item's SplitText lines during its
    // segment. scrub links progress directly to scroll position, so it reverses cleanly when
    // scrolling back up.
    function initStickyVideoReveal() {
        const section = document.querySelector('.section.sticky-video');
        const items = section ? Array.from(section.querySelectorAll('.video-featured-item')) : [];
        if (!section || !items.length) return;

        const itemTargets = items.map(item => {
            const targets = [];
            item.querySelectorAll('h1, h3').forEach(el => {
                const split = SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true });
                targets.push(...split.lines);
            });
            return targets;
        });

        const mediaQueries = gsap.matchMedia();

        mediaQueries.add('(prefers-reduced-motion: no-preference)', () => {
            itemTargets.forEach(targets => gsap.set(targets, { yPercent: 110 }));

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,
                },
            });

            itemTargets.forEach((targets, index) => {
                if (!targets.length) return;
                // Each .to() is positioned at its own integer slot on the timeline (0, 1, 2…)
                // with duration 1, so the scrubbed timeline splits evenly into itemTargets.length
                // segments — segment `index` spans scroll progress [index/N, (index+1)/N].
                tl.to(targets, { yPercent: 0, stagger: 0.08, ease: 'expo.out', duration: 1 }, index);
            });

            return () => tl.scrollTrigger.kill();
        });

        mediaQueries.add('(prefers-reduced-motion: reduce)', () => {
            itemTargets.forEach(targets => gsap.set(targets, { yPercent: 0 }));
        });
    }

    initStickyVideoReveal();

});
