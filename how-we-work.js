console.log('how-we-work.js loaded');

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

    // ─── Contour field background ─────────────────────────────────────────────
    // Fine iso-contour lines through a domain-warped noise field (WebGL2), fixed full-bleed
    // behind the page content. Values below are tuned live in prototypes/contour-field.html —
    // tune there, then copy the settings object across rather than editing the shader by feel.
    function initContourField() {
        // Capture the page's real cream before touching anything — both to feed the shader
        // the exact same color it's compositing against, and to find which sections share it.
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const creamMatch = bodyBg.match(/\d+/g);
        const creamRGB = creamMatch ? creamMatch.map(Number) : [255, 253, 246];

        const canvas = document.createElement('canvas');
        canvas.setAttribute('data-contour-field', '');
        Object.assign(canvas.style, {
            position: 'fixed',
            inset: '0',
            width: '100%',
            height: '100%',
            zIndex: '0',
            pointerEvents: 'none',
        });
        document.body.prepend(canvas);

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        // body and every section that shares the page's cream get their background stripped
        // so the fixed canvas behind them shows through — sections with their own deliberate
        // brand color (oxblood, footer green, etc.) keep it and simply sit on top as normal.
        document.body.style.backgroundColor = 'transparent';
        document.querySelectorAll('section, .section, [class*="section"], .page-wrapper').forEach((el) => {
            if (getComputedStyle(el).backgroundColor === bodyBg) {
                el.style.backgroundColor = 'transparent';
            }
        });

        const settings = {
            density: 7,
            lineWidth: 0.6,
            opacity: 0.14,
            warp: 1.15,
            scale: 1.4,
            speed: 0.005,
            lineColor: [100 / 255, 4 / 255, 0 / 255],
            cream: [creamRGB[0] / 255, creamRGB[1] / 255, creamRGB[2] / 255],
        };

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            settings.speed = 0;
        }

        const vertSrc = `#version 300 es
            in vec2 aPos;
            void main() {
              gl_Position = vec4(aPos, 0.0, 1.0);
            }
        `;

        // 2D simplex noise (Ashima Arts / webgl-noise, MIT).
        const noiseGLSL = `
            vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
            vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
            vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}

            float snoise(vec2 v){
              const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                  -0.577350269189626, 0.024390243902439);
              vec2 i  = floor(v + dot(v, C.yy));
              vec2 x0 = v -   i + dot(i, C.xx);
              vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
              vec4 x12 = x0.xyxy + C.xxzz;
              x12.xy -= i1;
              i = mod289(i);
              vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                      + i.x + vec3(0.0, i1.x, 1.0));
              vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
              m = m*m;
              m = m*m;
              vec3 x = 2.0 * fract(p * C.www) - 1.0;
              vec3 h = abs(x) - 0.5;
              vec3 ox = floor(x + 0.5);
              vec3 a0 = x - ox;
              m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
              vec3 g;
              g.x  = a0.x  * x0.x  + h.x  * x0.y;
              g.yz = a0.yz * x12.xz + h.yz * x12.yw;
              return 130.0 * dot(m, g);
            }

            float fbm(vec2 p) {
              float sum = 0.0;
              float amp = 0.5;
              for (int i = 0; i < 2; i++) {
                sum += amp * snoise(p);
                p *= 2.02;
                amp *= 0.52;
              }
              return sum;
            }

            float fbmWarp(vec2 p) {
              return snoise(p);
            }
        `;

        const fragSrc = `#version 300 es
            precision highp float;
            uniform vec2 uResolution;
            uniform float uTime;
            uniform float uDensity;
            uniform float uLineWidth;
            uniform float uOpacity;
            uniform float uWarp;
            uniform float uScale;
            uniform vec3 uCream;
            uniform vec3 uLineColor;
            out vec4 fragColor;

            ${noiseGLSL}

            void main() {
              vec2 uv = gl_FragCoord.xy / uResolution.xy;
              vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * uScale * 3.0;

              float t = uTime;
              vec2 warp = vec2(
                fbmWarp(p + vec2(11.3 + sin(t * 0.7) * 2.0, 4.1 + cos(t * 0.5) * 2.0)),
                fbmWarp(p + vec2(-7.7 + cos(t * 0.6) * 2.0, 2.9 + sin(t * 0.9) * 2.0))
              );

              float h = fbm(p + warp * uWarp);

              float v = h * uDensity;
              float g = abs(v - floor(v + 0.5));
              float aa = fwidth(v) * uLineWidth;
              float line = 1.0 - smoothstep(0.0, aa, g);

              vec3 col = mix(uCream, uLineColor, line * uOpacity);
              fragColor = vec4(col, 1.0);
            }
        `;

        function compile(type, src) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            return shader;
        }

        const program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSrc));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSrc));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
        gl.useProgram(program);

        const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const u = {
            resolution: gl.getUniformLocation(program, 'uResolution'),
            time: gl.getUniformLocation(program, 'uTime'),
            density: gl.getUniformLocation(program, 'uDensity'),
            lineWidth: gl.getUniformLocation(program, 'uLineWidth'),
            opacity: gl.getUniformLocation(program, 'uOpacity'),
            warp: gl.getUniformLocation(program, 'uWarp'),
            scale: gl.getUniformLocation(program, 'uScale'),
            cream: gl.getUniformLocation(program, 'uCream'),
            lineColor: gl.getUniformLocation(program, 'uLineColor'),
        };

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(window.innerWidth * dpr);
            canvas.height = Math.floor(window.innerHeight * dpr);
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        window.addEventListener('resize', resize);
        resize();

        let rafId;
        const start = performance.now();

        function frame(now) {
            const t = ((now - start) / 1000) * settings.speed;

            gl.uniform2f(u.resolution, canvas.width, canvas.height);
            gl.uniform1f(u.time, t);
            gl.uniform1f(u.density, settings.density);
            gl.uniform1f(u.lineWidth, settings.lineWidth);
            gl.uniform1f(u.opacity, settings.opacity);
            gl.uniform1f(u.warp, settings.warp);
            gl.uniform1f(u.scale, settings.scale);
            gl.uniform3f(u.cream, settings.cream[0], settings.cream[1], settings.cream[2]);
            gl.uniform3f(u.lineColor, settings.lineColor[0], settings.lineColor[1], settings.lineColor[2]);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            rafId = requestAnimationFrame(frame);
        }

        // Pause the render loop while the tab is hidden — no point spending battery
        // animating a background nobody's looking at.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
            } else {
                rafId = requestAnimationFrame(frame);
            }
        });

        rafId = requestAnimationFrame(frame);
    }

    initContourField();
});
