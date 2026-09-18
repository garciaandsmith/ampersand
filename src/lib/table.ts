export function tableRowClass(i: number) {
  return `border-b border-charcoal/10 last:border-0 hover:bg-charcoal/[0.025] ${
    i % 2 === 1 ? "bg-charcoal/[0.02]" : ""
  }`;
}
