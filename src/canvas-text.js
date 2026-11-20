export function canvasText(ctx, ink) {
  return function text(value, x, y, size = 22, color = ink, width = 1280) {
    ctx.fillStyle = color;
    ctx.font = `${size}px "Segoe UI", sans-serif`;
    let display = String(value);
    while (ctx.measureText(display).width > width && display.length > 1) display = display.slice(0, -2) + '…';
    ctx.fillText(display, x, y);
  };
}

export function canvasLines(ctx, value, width) {
  const lines = [];
  let line = '';
  for (const char of value) {
    if (line && ctx.measureText(line + char).width > width) {
      lines.push(line);
      line = '';
    }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}
