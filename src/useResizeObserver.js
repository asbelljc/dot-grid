import { useState, useEffect, useRef } from 'react';

export default function useResizeObserver(ref) {
  const [element, setElement] = useState(null);
  const [rect, setRect] = useState({});
  const observer = useRef(null);

  const cleanObserver = () => {
    if (observer.current) {
      observer.current.disconnect();
    }
  };

  useEffect(() => {
    setElement(ref.current);
  }, [ref]);

  useEffect(() => {
    if (!element) return;
    // Element has changed, so disconnect old observer
    cleanObserver();

    const ob = (observer.current = new ResizeObserver(([entry]) => {
      setRect(entry.target.getBoundingClientRect());
    }));

    ob.observe(element);
    // Disconnect when component is unmounted
    return () => {
      cleanObserver();
    };
  }, [element]);

  return rect;
}
