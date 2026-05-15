export type BandSkill = "reading" | "listening";

const READING: Array<[number, number, number]> = [
  [39, 40, 9],
  [37, 38, 8.5],
  [35, 36, 8],
  [33, 34, 7.5],
  [30, 32, 7],
  [27, 29, 6.5],
  [23, 26, 6],
  [19, 22, 5.5],
  [15, 18, 5],
  [13, 14, 4.5],
  [10, 12, 4],
  [8, 9, 3.5],
  [6, 7, 3],
  [4, 5, 2.5],
  [0, 3, 2],
];

const LISTENING: Array<[number, number, number]> = [
  [39, 40, 9],
  [37, 38, 8.5],
  [35, 36, 8],
  [32, 34, 7.5],
  [30, 31, 7],
  [26, 29, 6.5],
  [23, 25, 6],
  [18, 22, 5.5],
  [16, 17, 5],
  [13, 15, 4.5],
  [11, 12, 4],
  [8, 10, 3.5],
  [6, 7, 3],
  [4, 5, 2.5],
  [0, 3, 2],
];

export function getBand(correct: number, skill: BandSkill): number {
  const table = skill === "listening" ? LISTENING : READING;
  return table.find(([min, max]) => correct >= min && correct <= max)?.[2] ?? 0;
}
