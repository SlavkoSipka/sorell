'use client';

import { useEffect } from 'react';

let revealObserver: IntersectionObserver | null = null;

function getRevealObserver(): IntersectionObserver {
  if (revealObserver) return revealObserver;
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const delay = parseInt(el.dataset.revealDelay || '0', 10);
        setTimeout(() => el.classList.add('revealed'), delay);
        revealObserver?.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  );
  return revealObserver;
}

/** Posmatra [data-reveal] elemente; sigurno i posle dinamičkog mount-a. */
export function observeRevealElements(scope: ParentNode = document) {
  document.documentElement.classList.add('js-reveal-ready');
  const observer = getRevealObserver();
  const nodes = scope.querySelectorAll('[data-reveal]:not(.revealed)');
  nodes.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) {
      const delay = parseInt(htmlEl.dataset.revealDelay || '0', 10);
      setTimeout(() => htmlEl.classList.add('revealed'), delay);
      observer.unobserve(htmlEl);
    } else {
      observer.observe(htmlEl);
    }
  });
  return nodes.length;
}

export function useScrollReveal() {
  useEffect(() => {
    observeRevealElements(document);
    return () => {
      revealObserver?.disconnect();
      revealObserver = null;
      document.documentElement.classList.remove('js-reveal-ready');
    };
  }, []);
}
