export function dispatchSyntheticClick(
  target: Element,
  clientX: number,
  clientY: number,
): void {
  target.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  );
}

/**
 * After pointerup on a tap target, wait two animation frames for the browser's
 * native `click`. Synthesize one only if it never arrived (Android WebView).
 */
export function scheduleTapClickIfMissing(
  target: Element,
  clientX: number,
  clientY: number,
): void {
  let clickObserved = false;

  const onClick = () => {
    clickObserved = true;
  };

  target.addEventListener("click", onClick, { capture: true, once: true });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.removeEventListener("click", onClick, { capture: true });
      if (!clickObserved) {
        dispatchSyntheticClick(target, clientX, clientY);
      }
    });
  });
}
