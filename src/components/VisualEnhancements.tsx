import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Observe presentation only: no route remounts or changes to application state.
export default function VisualEnhancements() {
  const { pathname } = useLocation();
  useEffect(() => {
    const root = document.getElementById('main-content');
    if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('civic-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
    const decorate = () => root.querySelectorAll('.civic-card, .civic-home section > .container, .civic-page h1').forEach(el => {
      if (!el.classList.contains('civic-reveal')) {
        el.classList.add('civic-reveal');
        observer.observe(el);
      }
    });
    decorate();
    const mutation = new MutationObserver(decorate);
    mutation.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect(); mutation.disconnect();
      root.querySelectorAll('.civic-reveal').forEach(el => el.classList.add('civic-visible'));
    };
  }, [pathname]);
  return <a className="civic-skip" href="#main-content">Skip to content</a>;
}
