import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import gsap from 'https://cdn.skypack.dev/gsap@3.10.4';

import useResizeObserver from './useResizeObserver';

// DirectionalRotationPlugin start
gsap.registerPlugin({
  name: 'directionalRotation',
  init(target, values) {
    if (typeof values !== 'object') {
      values = { rotation: values };
    }
    var data = this,
      cap = values.useRadians ? Math.PI * 2 : 360,
      min = 1e-6,
      p,
      v,
      start,
      end,
      dif,
      split;
    data.endValues = {};
    data.target = target;
    for (p in values) {
      if (p !== 'useRadians') {
        end = values[p];
        split = (end + '').split('_');
        v = split[0];
        start = parseFloat(target[p]);
        end = data.endValues[p] =
          typeof v === 'string' && v.charAt(1) === '='
            ? start + parseInt(v.charAt(0) + '1', 10) * Number(v.substr(2))
            : +v || 0;
        dif = end - start;
        if (split.length) {
          v = split.join('_');
          if (~v.indexOf('short')) {
            dif = dif % cap;
            if (dif !== dif % (cap / 2)) {
              dif = dif < 0 ? dif + cap : dif - cap;
            }
          }
          if (v.indexOf('_cw') !== -1 && dif < 0) {
            dif = ((dif + cap * 1e10) % cap) - ((dif / cap) | 0) * cap;
          } else if (v.indexOf('ccw') !== -1 && dif > 0) {
            dif = ((dif - cap * 1e10) % cap) - ((dif / cap) | 0) * cap;
          }
        }
        if (dif > min || dif < -min) {
          data.add(target, p, start, start + dif);
          data._props.push(p);
        }
      }
    }
  },
  render(progress, data) {
    if (progress === 1) {
      for (let p in data.endValues) {
        data.target[p] = data.endValues[p];
      }
    } else {
      let pt = data._pt;
      while (pt) {
        pt.r(progress, pt.d);
        pt = pt._next;
      }
    }
  },
});
// DirectionalRotationPlugin end.

const Dot = function (left, top, color, lineWidth, alphaTickCount) {
  this.left = left;
  this.top = top;

  this.magnitude = 0.001;
  this.angle = 0;

  this.color = color;
  this.lineWidth = lineWidth;

  this.alphaTickCount = alphaTickCount;
  this.alphaFrame = Math.floor(Math.random() * (alphaTickCount + 1));
  this.alphaIncreasing = Math.random() < 0.5 ? true : false;
  this.alpha = 0;
};
Dot.prototype.setAlpha = function () {
  if (
    (this.alphaFrame === this.alphaTickCount && this.alphaIncreasing) ||
    (this.alphaFrame === 0 && !this.alphaIncreasing)
  ) {
    this.alphaIncreasing = !this.alphaIncreasing;
  }

  if (this.alphaIncreasing) {
    this.alphaFrame++;
  } else {
    this.alphaFrame--;
  }

  this.alpha = this.alphaFrame / this.alphaTickCount;
};
Dot.prototype.getAlpha = function (mouseOver) {
  return mouseOver ? 1 : this.alpha;
};
Dot.prototype.draw = function (context, mouseOver) {
  this.setAlpha();
  context.globalAlpha = this.getAlpha(mouseOver);
  context.strokeStyle = this.color;
  context.lineWidth = this.lineWidth;
  context.lineCap = 'round';

  context.save();
  context.beginPath();

  context.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    this.left,
    this.top
  );
  context.rotate(this.angle);

  context.moveTo(-this.magnitude / 2, 0);
  context.lineTo(this.magnitude / 2, 0);

  context.stroke();

  context.restore();
};

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const Canvas = styled.canvas`
  display: block;
  width: ${({ styleWidth }) => styleWidth};
  height: ${({ styleHeight }) => styleHeight};
`;

function App({
  dotSpacing,
  dotColor,
  lineWidth,
  alphaTickCount,
  maxMagnitude,
  radius,
}) {
  const canvasRef = useRef(null);
  const canvasBoxRef = useRef(null);
  const canvasBox = useResizeObserver(canvasBoxRef);

  const dots = useRef(null);

  const [relMousePosition, setRelMousePosition] = useState({ x: 0, y: 0 });
  const [mouseMoved, setMouseMoved] = useState(false);
  const mouseOver = useRef(false);

  // UPDATE MOUSE STATE
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvasBox && canvasBox.left) {
      const updateMousePosition = (e) => {
        if (e.targetTouches && e.targetTouches[0]) {
          e = e.targetTouches[0];
        }

        setRelMousePosition({
          x: e.clientX - canvasBox.left,
          y: e.clientY - canvasBox.top,
        });

        setMouseMoved(true);
      };

      const handleMouseEnter = () => {
        mouseOver.current = true;
      };

      const handleTouchStart = (e) => {
        mouseOver.current = true;
        updateMousePosition(e);
      };

      const reset = () => {
        mouseOver.current = false;

        dots.current.forEach((row) => {
          row.forEach((dot) => {
            gsap.to(dot, {
              duration: 0.8,
              magnitude: 0.001,
              directionalRotation: { angle: 0 + '_short', useRadians: true },
            });
          });
        });
      };

      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', updateMousePosition);
      document.addEventListener('touchend', reset);
      canvas.addEventListener('mouseenter', handleMouseEnter);
      canvas.addEventListener('mousemove', updateMousePosition);
      canvas.addEventListener('mouseleave', reset);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', updateMousePosition);
        document.removeEventListener('touchend', reset);
        canvas.removeEventListener('mouseenter', handleMouseEnter);
        canvas.removeEventListener('mousemove', updateMousePosition);
        canvas.removeEventListener('mouseleave', reset);
      };
    }
  }, [canvasBox]);

  // UPDATE DOTS ARRAY
  useEffect(() => {
    if (canvasBox && canvasBox.width) {
      const { width, height } = canvasBox;
      const numRows = Math.floor(height / dotSpacing);
      const numCols = Math.floor(width / dotSpacing);

      dots.current = [...new Array(numRows)].map((row, i) =>
        [...new Array(numCols)].map((col, j) => {
          const top = ((height * devicePixelRatio) / (numRows + 1)) * (i + 1);
          const left = ((width * devicePixelRatio) / (numCols + 1)) * (j + 1);

          return new Dot(left, top, dotColor, lineWidth, alphaTickCount);
        })
      );
    }
  }, [canvasBox, dotColor, lineWidth, alphaTickCount, dotSpacing]);

  // UPDATE DOT TRANSFORM IF NEED BE
  useEffect(() => {
    const calculateDotTransform = () => {
      const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

      dots.current.forEach((row) => {
        row.forEach((dot) => {
          const dx = relMousePosition.x - dot.left / devicePixelRatio;
          const dy = relMousePosition.y - dot.top / devicePixelRatio;
          const dist = Math.sqrt(dx ** 2 + dy ** 2) || 1;

          const angle = Math.atan2(dy, dx);
          const magnitude = clamp(radius / dist, 0.001, maxMagnitude);

          dot.alpha = 1;

          gsap.to(dot, {
            duration: 0.8,
            ease: 'elastic.out(1, 0.4)',
            magnitude: magnitude,
            directionalRotation: { angle: angle + '_short', useRadians: true },
          });
        });
      });
    };

    if (mouseMoved && mouseOver.current) {
      calculateDotTransform();
      setMouseMoved(false);
    }
  }, [mouseMoved, relMousePosition, maxMagnitude, radius]);

  // DRAW DOTS
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    function draw() {
      const { width, height } = canvasRef.current;
      ctx.clearRect(0, 0, width, height);

      dots.current &&
        dots.current.length &&
        dots.current.forEach((row) => {
          row.forEach((dot) => {
            dot.draw(ctx, mouseOver.current);
          });
        });
    }

    gsap.ticker.add(draw);

    return () => gsap.ticker.remove(draw);
  }, []);

  return (
    <Wrapper ref={canvasBoxRef}>
      <Canvas
        // keeping canvas and styled-components dimensions separate lets us downsample to keep things looking sharp on retina / high-DPI displays
        width={(canvasBox && canvasBox.width * devicePixelRatio) || null}
        height={(canvasBox && canvasBox.height * devicePixelRatio) || null}
        styleWidth={canvasBox && canvasBox.width + 'px'}
        styleHeight={canvasBox && canvasBox.height + 'px'}
        ref={canvasRef}
      ></Canvas>
    </Wrapper>
  );
}

export default App;
