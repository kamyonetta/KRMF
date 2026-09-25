/** Keep navigation outside the task-dependent sheet transform. */
export function dockNavigation(node: HTMLElement) {
  const frame = node.closest('.fit-frame');
  const placeholder = document.createComment('navigation position');
  node.before(placeholder);
  const move = () => {
    const dock = frame?.querySelector('.navigation-dock');
    if (dock) dock.appendChild(node);
  };
  const pending = requestAnimationFrame(move);
  return { destroy() { cancelAnimationFrame(pending); node.remove(); placeholder.remove(); } };
}
