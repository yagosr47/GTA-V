const bands = [
  ["Normal", 1],
  ["Levemente machucado", 0.91],
  ["Machucado", 0.76],
  ["Muito machucado", 0.57],
  ["Lesão grave", 0.34],
  ["Morrendo", 0.14],
  ["Morreu", 0],
] as const;
export function vitality(hp: number) {
  const level =
    hp >= 100
      ? 0
      : hp >= 80
        ? 1
        : hp >= 60
          ? 2
          : hp >= 40
            ? 3
            : hp >= 20
              ? 4
              : hp > 0
                ? 5
                : 6;
  return { level, label: bands[level][0], speed: bands[level][1] };
}
