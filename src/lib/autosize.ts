/** Grow editable notes rather than introducing an inner scrollbar. */
export function autosize(node: HTMLTextAreaElement, value: string) {
  let frame = 0;
  const resize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight + 2}px`;
    });
  };
  resize();
  node.addEventListener('input', resize);
  return { update(_value: string) { resize(); }, destroy() { cancelAnimationFrame(frame); node.removeEventListener('input',resize); } };
}
