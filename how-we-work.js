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

    // ─── Sticky-video service items: scroll-scrubbed SplitText crossfade ────────────────────
    // Only one .video-featured-item is ever meant to be on screen, centered in the pinned card,
    // with the next one's SplitText entrance overlapping the current one's exit. Items are
    // stacked absolutely on top of each other (wrapper height pinned to the tallest item, since
    // absolute children can't otherwise size their parent) and cross-animated on a single
    // scroll-scrubbed timeline built off .section.sticky-video's scroll range.
    //
    // SplitText's split targets aren't guaranteed to exist synchronously right after .create()
    // — the split can defer until web fonts are ready — so targets are collected from the
    // onSplit callback (same convention as global.js) rather than read off the return value
    // directly.
    //
    // Both the heading (service name) and description split by word — a char split on the
    // heading was wrapping badly, so both use the same split type here.
    function initStickyVideoReveal() {
        const section = document.querySelector('.section.sticky-video');
        const wrapper = section ? section.querySelector('.video-features-wrapper') : null;
        const items = wrapper ? Array.from(wrapper.querySelectorAll('.video-featured-item')) : [];
        if (!section || !wrapper || !items.length) return;

        const splitSpecByItem = items.map(item => {
            const heading = item.querySelector('h1');
            const description = item.querySelector('h3');
            const specs = [];
            if (heading) specs.push({ el: heading, type: 'words', stagger: 0.06 });
            if (description) specs.push({ el: description, type: 'words', stagger: 0.06 });
            return specs;
        });
        const splitTargetsByElement = new Map();

        function stackItems() {
            const tallest = Math.max(...items.map(item => item.getBoundingClientRect().height));
            wrapper.style.position = 'relative';
            wrapper.style.height = tallest + 'px';
            items.forEach(item => {
                Object.assign(item.style, { position: 'absolute', top: '0', left: '0', width: '100%' });
            });
        }

        const mediaQueries = gsap.matchMedia();

        mediaQueries.add('(prefers-reduced-motion: no-preference)', () => {
            let scrollTl = null;
            let pendingSplits = splitSpecByItem.reduce((sum, specs) => sum + specs.length, 0);

            // Transition width, as a fraction of one item's scroll slot — how much of the
            // outgoing/incoming items' slots is spent exiting/entering at each boundary.
            const transitionDuration = 0.4;

            function rebuildTimeline() {
                if (scrollTl) {
                    scrollTl.scrollTrigger.kill();
                    scrollTl.kill();
                    scrollTl = null;
                }

                stackItems();

                // Each item keeps its char (heading) and word (description) targets in separate
                // groups — not flattened together — so each group animates at its own stagger
                // pace while both groups still share the same entrance/exit timeline position.
                const itemGroups = splitSpecByItem.map(specs =>
                    specs.map(spec => ({ targets: splitTargetsByElement.get(spec.el) || [], stagger: spec.stagger }))
                );

                itemGroups.forEach((groups, index) => {
                    groups.forEach(group => {
                        gsap.set(group.targets, { yPercent: index === 0 ? 0 : 110, opacity: index === 0 ? 1 : 0 });
                    });
                });

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: section,
                        start: 'top top',
                        end: 'bottom bottom',
                        scrub: true,
                    },
                });

                itemGroups.forEach((groups, index) => {
                    groups.forEach(group => {
                        if (!group.targets.length) return;

                        // Exit: slides up and out, finishing exactly at the boundary with the
                        // next item (not overlapping it).
                        if (index < itemGroups.length - 1) {
                            tl.to(group.targets, { yPercent: -110, opacity: 0, stagger: group.stagger, ease: 'expo.in', duration: transitionDuration }, index + 1 - transitionDuration);
                        }

                        // Entrance: starts exactly where the previous item's exit above ends.
                        if (index > 0) {
                            tl.fromTo(group.targets, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: group.stagger, ease: 'expo.out', duration: transitionDuration }, index);
                        }
                    });
                });

                scrollTl = tl;
                ScrollTrigger.refresh();
            }

            splitSpecByItem.forEach(specs => {
                specs.forEach(spec => {
                    SplitText.create(spec.el, {
                        type: spec.type,
                        mask: spec.type,
                        autoSplit: true,
                        onSplit(instance) {
                            splitTargetsByElement.set(spec.el, instance[spec.type]);

                            if (pendingSplits > 0) {
                                pendingSplits--;
                                if (pendingSplits === 0) rebuildTimeline();
                            } else {
                                // A resplit after the initial build (resize, font swap) — rebuild
                                // in place so the timeline picks up the current split targets.
                                rebuildTimeline();
                            }
                        },
                    });
                });
            });

            return () => {
                if (scrollTl) {
                    scrollTl.scrollTrigger.kill();
                    scrollTl.kill();
                }
            };
        });

        mediaQueries.add('(prefers-reduced-motion: reduce)', () => {
            stackItems();

            splitSpecByItem.forEach((specs, index) => {
                specs.forEach(spec => {
                    SplitText.create(spec.el, {
                        type: spec.type,
                        mask: spec.type,
                        autoSplit: true,
                        onSplit(instance) {
                            gsap.set(instance[spec.type], { yPercent: index === 0 ? 0 : -110, opacity: index === 0 ? 1 : 0 });
                        },
                    });
                });
            });
        });
    }

    initStickyVideoReveal();

});


gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase);
CustomEase.create("spatial", "0.25, 0.1, 0, 1");

function initSpatialCardsSlider() {
  const slideDuration = 1;
  const clickEase = 'spatial';

  // Original (non-cloned) cards persist across re-inits, so their bio
  // paragraph SplitText instance must be reverted to plain text before
  // re-cloning below — otherwise clones would inherit already-split markup.
  revertCollectiveCardSplits();

  document.querySelectorAll('[data-spatial-slider-init]').forEach(container => {
    if (container._spatialSliderDraggable) container._spatialSliderDraggable.kill();
    if (container._spatialSliderImageObserver) container._spatialSliderImageObserver.disconnect();

    if (container._spatialSliderProxy) {
      gsap.killTweensOf(container._spatialSliderProxy);
      container._spatialSliderProxy.remove();
    }

    const collection = container.querySelector('[data-spatial-slider-collection]');
    const track = container.querySelector('[data-spatial-slider-list]');
    if (!collection || !track) return;

    gsap.set(track, { clearProps: 'transform' });

    container.querySelectorAll('[data-spatial-slider-item]').forEach(item => {
      gsap.set(item, { clearProps: 'transform' });
    });

    container.querySelectorAll('[data-spatial-slider-clone]').forEach(el => el.remove());

    const originalItems = Array.from(track.querySelectorAll(':scope > [data-spatial-slider-item]:not([data-spatial-slider-clone])'));
    if (!originalItems.length) return;

    container.setAttribute('role', 'region');
    container.setAttribute('aria-roledescription', 'carousel');
    container.setAttribute('aria-label', container.getAttribute('aria-label') || 'Spatial Cards Slider');
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', 'Slides');

    const dotsWrap = container.querySelector('[data-spatial-slider-generate-dots]');

    if (dotsWrap) {
      const dots = Array.from(dotsWrap.querySelectorAll('[data-spatial-slider-control]'));

      if (dots.length) {
        const template = dots[0];
        dots.slice(1).forEach(dot => dot.remove());

        for (let i = 1; i <= originalItems.length; i++) {
          const dot = i === 1 ? template : template.cloneNode(true);
          dot.setAttribute('data-spatial-slider-control', String(i));
          dot.setAttribute('data-spatial-slider-control-status', 'not-active');
          if (i > 1) dotsWrap.appendChild(dot);
        }
      }
    }

    const controls = Array.from(container.querySelectorAll('[data-spatial-slider-control]'));
    const totalEl = container.querySelector('[data-spatial-slider-total-slide]');
    const indicators = Array.from(container.querySelectorAll('[data-spatial-slider-active-slide]'));
    const mod = (value, total) => ((value % total) + total) % total;
    const formatNumber = value => value < 10 ? '0' + value : String(value);

    if (totalEl) totalEl.textContent = formatNumber(originalItems.length);

    originalItems.forEach((item, index) => {
      item.removeAttribute('data-spatial-slider-item-status');
      item.removeAttribute('aria-hidden');
      item.setAttribute('role', 'group');
      item.setAttribute('aria-label', `Slide ${index + 1} of ${originalItems.length}`);
    });

    controls.forEach(btn => {
      const value = btn.getAttribute('data-spatial-slider-control');

      if (value === 'prev') btn.setAttribute('aria-label', 'Previous slide');
      if (value === 'next') btn.setAttribute('aria-label', 'Next slide');

      if (/^\d+$/.test(value)) {
        btn.setAttribute('aria-label', `Go to slide ${value}`);
        btn.setAttribute('aria-current', 'false');
      }
    });

    const containerStyles = getComputedStyle(container);
    const trackStyles = getComputedStyle(track);
    const curve = Math.abs(parseFloat(containerStyles.getPropertyValue('--slider-curve'))) || 12;
    const directionValue = parseFloat(containerStyles.getPropertyValue('--slider-direction'));
    const direction = directionValue < 0 ? -1 : 1;
    const gap = parseFloat(trackStyles.columnGap) || 0;
    const curveRadians = curve * Math.PI / 180;

    const firstRect = originalItems[0].getBoundingClientRect();
    const itemWidth = firstRect.width;
    const itemHeight = firstRect.height;

    const perspectiveValue = parseFloat(getComputedStyle(track).perspective);
    const perspective = Number.isFinite(perspectiveValue) ? perspectiveValue : 1200;

    const getProjectedEdgeX = (radius, angle, side) => {
      const radians = angle * Math.PI / 180;
      const rotation = -direction * radians;
      const localX = side * itemWidth / 2;

      const centerX = Math.sin(radians) * radius;
      const centerZ = direction * radius * (1 - Math.cos(radians));

      const x = centerX + localX * Math.cos(rotation);
      const z = centerZ - localX * Math.sin(rotation);

      return x * perspective / (perspective - z);
    };

    let spatialRadius = itemWidth / Math.sin(curveRadians);

    for (let i = 0; i < 8; i++) {
      const nextLeft = getProjectedEdgeX(spatialRadius, curve, -1);
      const currentRight = itemWidth / 2;
      const currentGap = nextLeft - currentRight;
      const correction = gap - currentGap;

      spatialRadius += correction / Math.sin(curveRadians);
    }

    const stepDistance = Math.sin(curveRadians) * spatialRadius;
    const tangentRatio = (-direction * spatialRadius) / (perspective - direction * spatialRadius);
    const edgeAngle = Math.acos(gsap.utils.clamp(-1, 1, tangentRatio)) * 180 / Math.PI;
    const maxSideItems = Math.ceil(edgeAngle / curve);
    const maxLoopItems = maxSideItems * 2;

    const getSpatialPosition = offset => {
      const angle = gsap.utils.clamp(-edgeAngle, edgeAngle, offset * curve);
      const radians = angle * Math.PI / 180;

      return {
        x: Math.sin(radians) * spatialRadius,
        z: direction * spatialRadius * (1 - Math.cos(radians)),
        rotationY: -direction * angle
      };
    };

    const containerRect = container.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const originX = trackRect.left + trackRect.width / 2;
    const leftLimit = containerRect.left - originX;
    const rightLimit = containerRect.right - originX;

    const isOffsetInside = offset => {
      if (Math.abs(offset * curve) >= edgeAngle) return false;

      const position = getSpatialPosition(offset);
      const scale = perspective / (perspective - position.z);
      const radians = Math.abs(position.rotationY) * Math.PI / 180;
      const halfWidth = Math.abs(Math.cos(radians)) * itemWidth * scale / 2;
      const x = position.x * scale;

      return x + halfWidth >= leftLimit && x - halfWidth <= rightLimit;
    };

    const getVisibleCount = () => {
      let left = 0;
      let right = 0;

      for (let i = 1; i < maxSideItems && isOffsetInside(i); i++) right = i;
      for (let i = 1; i < maxSideItems && isOffsetInside(-i); i++) left = i;

      return Math.min(maxLoopItems, 1 + left + right + 2);
    };

    const minItemsNeeded = getVisibleCount();
    const neededItems = originalItems.length >= minItemsNeeded
      ? originalItems.length
      : Math.ceil(minItemsNeeded / originalItems.length) * originalItems.length;

    for (let i = originalItems.length; i < neededItems; i++) {
      const clone = originalItems[i % originalItems.length].cloneNode(true);
      clone.setAttribute('data-spatial-slider-clone', '');
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    const items = Array.from(track.querySelectorAll(':scope > [data-spatial-slider-item]'));
    const totalItems = items.length;

    track.style.height = itemHeight + 'px';
    container.setAttribute('data-spatial-slider-drag-status', 'grab');

    items.forEach(item => item.setAttribute('data-spatial-slider-item-status', 'not-active'));

    const proxy = document.createElement('div');
    proxy.setAttribute('data-spatial-slider-proxy', '');

    Object.assign(proxy.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      pointerEvents: 'none',
      opacity: '0'
    });

    container.appendChild(proxy);
    container._spatialSliderProxy = proxy;

    gsap.set(proxy, { x: 0 });

    const setX = items.map(item => gsap.quickSetter(item, 'x', 'px'));
    const setZ = items.map(item => gsap.quickSetter(item, 'z', 'px'));
    const setRotationY = items.map(item => gsap.quickSetter(item, 'rotationY', 'deg'));

    const getIndex = () => -gsap.getProperty(proxy, 'x') / stepDistance;

    const nearestDelta = (index, realIndex) => {
      const loop = Math.round((realIndex - index) / totalItems);
      return index - (realIndex - loop * totalItems);
    };

    const getSlideDelta = (target, realIndex) => {
      let bestDelta = 0;
      let bestDistance = Infinity;

      items.forEach((item, index) => {
        if (index % originalItems.length !== target) return;

        const delta = nearestDelta(index, realIndex);
        const distance = Math.abs(delta);

        if (distance < bestDistance) {
          bestDelta = delta;
          bestDistance = distance;
        }
      });

      return bestDelta;
    };

    let lastActiveIndex = null;

    const updateActiveUI = (activeIndex, activeSlideIndex) => {
      if (activeIndex === lastActiveIndex) return;

      items.forEach((item, index) => {
        item.setAttribute('data-spatial-slider-item-status', index === activeIndex ? 'active' : 'inview');
      });

      indicators.forEach(el => el.textContent = formatNumber(activeSlideIndex + 1));

      controls.forEach(btn => {
        const value = btn.getAttribute('data-spatial-slider-control');
        if (!/^\d+$/.test(value)) return;

        const isActive = parseInt(value, 10) - 1 === activeSlideIndex;
        btn.setAttribute('data-spatial-slider-control-status', isActive ? 'active' : 'not-active');
        btn.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      lastActiveIndex = activeIndex;
    };

    const render = () => {
      const realIndex = getIndex();
      const activeIndex = mod(Math.round(realIndex), totalItems);
      const activeSlideIndex = activeIndex % originalItems.length;

      items.forEach((item, index) => {
        const position = getSpatialPosition(nearestDelta(index, realIndex));

        setX[index](position.x);
        setZ[index](position.z);
        setRotationY[index](position.rotationY);
      });

      updateActiveUI(activeIndex, activeSlideIndex);
    };

    controls.forEach(btn => {
      const value = btn.getAttribute('data-spatial-slider-control');
      btn.disabled = false;

      btn.onclick = () => {
        gsap.killTweensOf(proxy);

        const currentIndex = getIndex();
        let targetIndex;

        if (value === 'next' || value === 'prev') {
          targetIndex = Math.round(currentIndex) + (value === 'next' ? 1 : -1);
        } else if (/^\d+$/.test(value)) {
          const targetSlide = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
          targetIndex = currentIndex + getSlideDelta(targetSlide, currentIndex);
        } else {
          return;
        }

        gsap.to(proxy, {
          x: -targetIndex * stepDistance,
          duration: slideDuration,
          ease: clickEase,
          onUpdate: render
        });
      };
    });

    container._spatialSliderDraggable = Draggable.create(proxy, {
      type: 'x',
      trigger: collection,
      inertia: true,
      throwResistance: 2000,
      dragResistance: 0.05,
      maxDuration: 1,
      minDuration: 0.5,
      edgeResistance: 0.75,
      overshootTolerance: 0,
      snap: value => Math.round(value / stepDistance) * stepDistance,
      onDrag: render,
      onThrowUpdate: render,
      onThrowComplete: () => {
        container.setAttribute('data-spatial-slider-drag-status', 'grab');
        render();
      },
      onPress: () => container.setAttribute('data-spatial-slider-drag-status', 'grabbing'),
      onDragStart: () => container.setAttribute('data-spatial-slider-drag-status', 'grabbing'),
      onRelease: () => container.setAttribute('data-spatial-slider-drag-status', 'grab')
    })[0];

    render();

    // Fix for Lazy Loading images on Safari
    container._spatialSliderImageObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      container.querySelectorAll('[data-spatial-slider-item] img[loading="lazy"]').forEach(img => {
        img.loading = 'eager';
      });
      observer.disconnect();
    });
    container._spatialSliderImageObserver.observe(container);
  });

  initCollectiveCardBios();

  if (initSpatialCardsSlider._resize) window.removeEventListener('resize', initSpatialCardsSlider._resize);

  initSpatialCardsSlider._resize = debounceOnWidthChange(initSpatialCardsSlider, 200);
  window.addEventListener('resize', initSpatialCardsSlider._resize);
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

// ─── Collective card bios: read-more toggle ──────────────────────────────────
// .read-more-button and .bio-text-wrapper live under sibling parents inside
// .collective-card, so each card's button and wrapper are matched by looking
// them up independently within the same card rather than via direct nesting.
// Runs after cloning (called at the end of initSpatialCardsSlider) so slider
// clones — whose listeners aren't copied by cloneNode — get bound too; the
// per-card handler is stored on the card itself so re-running on resize
// doesn't double-bind the original (non-cloned) cards.
const bioEase = 'cubic-bezier(0.625, 0.05, 0, 1)';
const bioDuration = 0.36;
const bioWordStagger = 0.03;

function revertCollectiveCardSplits() {
  document.querySelectorAll('.collective-card').forEach(card => {
    if (card._bioSplit) {
      card._bioSplit.revert();
      card._bioSplit = null;
    }
  });
}

function initCollectiveCardBios() {
  document.querySelectorAll('.collective-card').forEach(card => {
    const button = card.querySelector('.read-more-button');
    const bioWrapper = card.querySelector('.bio-text-wrapper');
    const paragraph = bioWrapper ? bioWrapper.querySelector('p') : null;
    if (!button || !bioWrapper) return;

    if (card._bioToggleHandler) button.removeEventListener('click', card._bioToggleHandler);
    if (card._bioSplit) card._bioSplit.revert();

    gsap.set(bioWrapper, { height: 0, overflow: 'hidden' });
    button.setAttribute('aria-expanded', 'false');
    card.setAttribute('data-bio-status', 'closed');

    let isOpen = false;
    let words = [];

    if (paragraph) {
      card._bioSplit = SplitText.create(paragraph, {
        type: 'words',
        mask: 'words',
        autoSplit: true,
        onSplit(instance) {
          words = instance.words;
          gsap.set(words, { yPercent: 110, opacity: 0 });
        }
      });
    }

    const handler = () => {
      isOpen = !isOpen;

      gsap.killTweensOf([bioWrapper, ...words]);

      const tl = gsap.timeline();

      tl.to(bioWrapper, {
        height: isOpen ? '100%' : 0,
        duration: bioDuration,
        ease: bioEase
      }, 0);

      if (words.length) {
        tl.to(words, {
          yPercent: isOpen ? 0 : 110,
          opacity: isOpen ? 1 : 0,
          stagger: bioWordStagger,
          duration: bioDuration,
          ease: bioEase
        }, isOpen ? bioDuration * 0.15 : 0);
      }

      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      card.setAttribute('data-bio-status', isOpen ? 'open' : 'closed');
    };

    card._bioToggleHandler = handler;
    button.addEventListener('click', handler);
  });
}

// Initialize Spatial Cards Slider (GSAP)
document.addEventListener('DOMContentLoaded', () => {
  initSpatialCardsSlider();
});