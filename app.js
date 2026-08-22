(() => {
  "use strict";

  const SOURCES = window.MARCO_MATH_SOURCES || [];
  const LETTERS = ["A", "B", "C", "D"];
  const SESSION_SIZE = 20;
  const MAX_ROUNDS = 3;
  const STORAGE_KEY = "marco-isee-math-mastery-v1";
  const CATEGORY_SHORT = {
    "Number Sense & Operations": "Number Sense",
    "Ratios, Rates & Percents": "Ratios & Percents",
    "Algebra & Functions": "Algebra",
    "Geometry & Measurement": "Geometry",
    "Data Analysis & Statistics": "Data & Statistics",
    "Probability & Counting": "Probability",
  };

  const app = document.querySelector("#app");
  const picker = document.querySelector("#session-picker");
  const announcement = document.querySelector("#announcement");
  const navButtons = [...document.querySelectorAll("[data-view]")];

  const SOURCE_BY_ID = new Map(SOURCES.map((item) => [item.id, item]));
  const SESSIONS = Array.from({ length: Math.ceil(SOURCES.length / SESSION_SIZE) }, (_, index) => {
    const items = SOURCES.slice(index * SESSION_SIZE, (index + 1) * SESSION_SIZE);
    return {
      number: index + 1,
      ids: items.map((item) => item.id),
      subjects: [...new Set(items.map((item) => item.subject))],
      categories: [...new Set(items.map((item) => CATEGORY_SHORT[item.category]))],
    };
  });

  function freshSession() {
    return {
      status: "not-started",
      round: 0,
      activeIds: [],
      pendingIds: [],
      position: 0,
      answers: {},
      history: [],
      mastered: false,
      finalMissed: [],
      updatedAt: null,
    };
  }

  function freshState() {
    return {
      version: 1,
      view: "practice",
      selectedSession: 1,
      sessions: Object.fromEntries(SESSIONS.map((session) => [session.number, freshSession()])),
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed?.version === 1 && parsed.sessions && parsed.sessions["1"]) return parsed;
    } catch {
      // Start clean if local data is incomplete.
    }
    return freshState();
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setAnnouncement(message) {
    announcement.textContent = message;
    announcement.hidden = !message;
  }

  function esc(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function seeded(item, round, offset, min, max) {
    const span = max - min + 1;
    const value = (item.id * 37 + round * 53 + offset * 29 + item.mock * 11 + item.question) % span;
    return min + value;
  }

  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x || 1;
  }

  function fraction(numerator, denominator) {
    const divisor = gcd(numerator, denominator);
    const n = numerator / divisor;
    const d = denominator / divisor;
    return d === 1 ? String(n) : `${n}/${d}`;
  }

  function money(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function choiceSet(correct, distractors, item, round) {
    const unique = [];
    [correct, ...distractors].map(String).forEach((choice) => {
      if (!unique.includes(choice)) unique.push(choice);
    });
    let filler = 1;
    while (unique.length < 4) {
      const candidate = `Choice ${filler}`;
      if (!unique.includes(candidate)) unique.push(candidate);
      filler += 1;
    }
    const choices = unique.slice(1, 4);
    const positions = [0, 1, 3];
    const correctIndex = (item.id + positions[round - 1]) % 4;
    choices.splice(correctIndex, 0, unique[0]);
    return { choices, answer: LETTERS[correctIndex] };
  }

  function finish(item, round, stem, correct, distractors, explanation) {
    const options = choiceSet(correct, distractors, item, round);
    return { stem, choices: options.choices, answer: options.answer, explanation };
  }

  const generators = {
    mean(item, round) {
      const mean = seeded(item, round, 1, 7, 18);
      const deviations = round === 1 ? [-5, -2, 0, 3, 4] : round === 2 ? [-4, -1, 0, 2, 3] : [-6, -2, 1, 3, 4];
      const values = deviations.map((value) => mean + value);
      const sum = mean * values.length;
      return finish(
        item,
        round,
        `The five values are ${values.join(", ")}. What is their mean?`,
        mean,
        [mean - 1, mean + 1, sum],
        `Their sum is ${sum}. Divide by 5: ${sum} ÷ 5 = ${mean}.`,
      );
    },

    median(item, round) {
      const middle = seeded(item, round, 2, 9, 24);
      const sorted = [middle - 6, middle - 2, middle, middle + 3, middle + 8];
      const displayed = [sorted[3], sorted[0], sorted[4], sorted[2], sorted[1]];
      return finish(
        item,
        round,
        `Find the median of ${displayed.join(", ")}.`,
        middle,
        [middle - 2, middle + 3, middle + 1],
        `In order, the values are ${sorted.join(", ")}. The middle value is ${middle}.`,
      );
    },

    mode(item, round) {
      const mode = seeded(item, round, 3, 3, 12);
      const values = [mode - 2, mode, mode + 3, mode, mode + 1, mode, mode - 1];
      return finish(
        item,
        round,
        `Which number is the mode of this data set: ${values.join(", ")}?`,
        mode,
        [mode - 1, mode + 1, "There is no mode"],
        `${mode} appears three times, more often than any other value.`,
      );
    },

    range(item, round) {
      const low = seeded(item, round, 4, 2, 11);
      const spread = seeded(item, round, 5, 8, 18);
      const values = [low + 4, low + spread, low, low + 7, low + spread - 3];
      return finish(
        item,
        round,
        `What is the range of ${values.join(", ")}?`,
        spread,
        [spread - 1, spread + low, spread + 2],
        `Range = greatest − least = ${low + spread} − ${low} = ${spread}.`,
      );
    },

    line_rate(item, round) {
      const units = seeded(item, round, 6, 4, 9);
      const rate = seeded(item, round, 7, 12, 35);
      const total = units * rate;
      return finish(
        item,
        round,
        `A straight trend line passes through (${units}, ${total}) and (0, 0). What rate does the line show per unit?`,
        rate,
        [rate - 2, rate + 2, total],
        `Rate is rise ÷ run: ${total} ÷ ${units} = ${rate} per unit.`,
      );
    },

    data_reading(item, round) {
      const base = seeded(item, round, 8, 10, 25);
      const values = [base + 2, base + 8, base + 5, base + 1];
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday"];
      const shift = (item.id + round) % 4;
      const rotated = values.map((_, index) => values[(index + shift) % 4]);
      const maxIndex = rotated.indexOf(Math.max(...rotated));
      const table = days.map((day, index) => `${day}: ${rotated[index]}`).join("; ");
      return finish(
        item,
        round,
        `A study log shows ${table}. Which day has the greatest value?`,
        days[maxIndex],
        days.filter((_, index) => index !== maxIndex),
        `${days[maxIndex]} has ${rotated[maxIndex]}, the largest value in the table.`,
      );
    },

    percent_change(item, round) {
      const base = seeded(item, round, 9, 4, 12) * 20;
      const percent = [10, 20, 25][(item.id + round) % 3];
      const increase = (item.id + round) % 2 === 0;
      const change = (base * percent) / 100;
      const result = increase ? base + change : base - change;
      const direction = increase ? "increased" : "decreased";
      return finish(
        item,
        round,
        `A price of ${money(base)} is ${direction} by ${percent}%. What is the new price?`,
        money(result),
        [money(base + (increase ? -change : change)), money(change), money(result + 10)],
        `${percent}% of ${money(base)} is ${money(change)}. ${increase ? "Add" : "Subtract"} that change to get ${money(result)}.`,
      );
    },

    ratio(item, round) {
      const left = seeded(item, round, 10, 2, 6);
      const right = seeded(item, round, 11, 3, 8);
      const scale = seeded(item, round, 12, 3, 7);
      const target = right * scale;
      const answer = left * scale;
      return finish(
        item,
        round,
        `The ratio of blue tiles to green tiles is ${left}:${right}. If there are ${target} green tiles, how many blue tiles are there?`,
        answer,
        [answer - left, answer + left, target - answer],
        `The scale factor is ${target} ÷ ${right} = ${scale}. Multiply ${left} × ${scale} = ${answer}.`,
      );
    },

    speed(item, round) {
      const time = seeded(item, round, 13, 2, 6);
      const rate = seeded(item, round, 14, 4, 13) * 5;
      const distance = rate * time;
      return finish(
        item,
        round,
        `A cyclist travels ${distance} miles in ${time} hours at a constant speed. What is the speed?`,
        `${rate} mph`,
        [`${rate - 5} mph`, `${rate + 5} mph`, `${distance + time} mph`],
        `Speed = distance ÷ time = ${distance} ÷ ${time} = ${rate} mph.`,
      );
    },

    revenue(item, round) {
      const people = seeded(item, round, 15, 6, 12) * 10;
      const fee = seeded(item, round, 16, 4, 9);
      const cost = seeded(item, round, 17, 2, 7) * 50;
      const net = people * fee - cost;
      return finish(
        item,
        round,
        `An event earns ${money(fee)} from each of ${people} guests and costs ${money(cost)} to run. What is the net revenue?`,
        money(net),
        [money(people * fee), money(net + cost / 2), money(net - 50)],
        `Gross revenue is ${people} × ${money(fee)} = ${money(people * fee)}. Subtract ${money(cost)} to get ${money(net)}.`,
      );
    },

    part_fraction(item, round) {
      const firstN = [2, 3, 4][(item.id + round) % 3];
      const firstD = firstN + 2;
      const secondN = [1, 2, 3][(item.id + round * 2) % 3];
      const secondD = secondN + 3;
      const correct = fraction(firstN * secondN, firstD * secondD);
      return finish(
        item,
        round,
        `What fraction is ${firstN}/${firstD} of ${secondN}/${secondD}?`,
        correct,
        [fraction(firstN + secondN, firstD + secondD), fraction(firstN * secondD, firstD * secondN), fraction(firstN, firstD * secondD)],
        `“Of” means multiply: (${firstN}/${firstD}) × (${secondN}/${secondD}) = ${correct}.`,
      );
    },

    proportion(item, round) {
      const a = seeded(item, round, 18, 2, 7);
      const b = seeded(item, round, 19, 3, 9);
      const scale = seeded(item, round, 20, 2, 6);
      const denominator = b * scale;
      const answer = a * scale;
      return finish(
        item,
        round,
        `Solve the proportion ${a}/${b} = n/${denominator}.`,
        answer,
        [answer - a, answer + a, denominator - answer],
        `${b} is multiplied by ${scale} to make ${denominator}, so multiply ${a} by ${scale}: n = ${answer}.`,
      );
    },

    arithmetic(item, round) {
      const a = seeded(item, round, 21, 18, 49);
      const b = seeded(item, round, 22, 7, 17);
      const multiply = (item.id + round) % 3 === 0;
      if (multiply) {
        const x = seeded(item, round, 23, 4, 12);
        const y = seeded(item, round, 24, 3, 9);
        return finish(item, round, `Compute ${x} × ${y} − ${b}.`, x * y - b, [x * y + b, x + y - b, x * (y - b)], `Multiply first: ${x} × ${y} = ${x * y}. Then subtract ${b} to get ${x * y - b}.`);
      }
      return finish(item, round, `Compute ${a} − ${b} + ${round + 5}.`, a - b + round + 5, [a - b, a + b - round - 5, a - b - round - 5], `Work left to right: ${a} − ${b} = ${a - b}, then add ${round + 5} to get ${a - b + round + 5}.`);
    },

    fraction_ops(item, round) {
      const a = seeded(item, round, 25, 2, 5);
      const b = seeded(item, round, 26, 3, 7);
      const numerator = a + b;
      const denominator = a * b;
      const correct = fraction(numerator, denominator);
      return finish(
        item,
        round,
        `Compute 1/${a} + 1/${b}.`,
        correct,
        [fraction(2, a + b), fraction(1, a + b), fraction(a * b, a + b)],
        `Use denominator ${a * b}: 1/${a} + 1/${b} = ${b}/${a * b} + ${a}/${a * b} = ${correct}.`,
      );
    },

    powers(item, round) {
      const n = seeded(item, round, 27, 2, 5);
      const m = seeded(item, round, 28, 1, 4);
      const value = (2 ** n) * (3 ** m);
      return finish(
        item,
        round,
        `${value} = 2ⁿ × 3ᵐ. What is n + m?`,
        n + m,
        [n * m, n + m - 1, n + m + 1],
        `${value} = 2^${n} × 3^${m}, so n + m = ${n} + ${m} = ${n + m}.`,
      );
    },

    roots(item, round) {
      const root = seeded(item, round, 29, 4, 15);
      const square = root * root;
      return finish(item, round, `What is √${square}?`, root, [root - 1, root + 1, square / 2], `${root} × ${root} = ${square}, so √${square} = ${root}.`);
    },

    scientific(item, round) {
      const exponent = seeded(item, round, 30, 3, 6);
      const a = seeded(item, round, 31, 2, 6);
      const b = seeded(item, round, 32, 1, 3);
      const sum = a + b;
      const correct = `${sum} × 10^${exponent}`;
      return finish(
        item,
        round,
        `Compute (${a} × 10^${exponent}) + (${b} × 10^${exponent}).`,
        correct,
        [`${sum} × 10^${exponent + 1}`, `${a * b} × 10^${exponent}`, `${sum} × 10^${exponent - 1}`],
        `The powers of 10 match, so add the coefficients: ${a} + ${b} = ${sum}.`,
      );
    },

    estimate(item, round) {
      const a = seeded(item, round, 33, 3, 8) * 100 + seeded(item, round, 34, 10, 49);
      const b = seeded(item, round, 35, 3, 8) * 100 + seeded(item, round, 36, 10, 49);
      const roundedA = Math.round(a / 100) * 100;
      const roundedB = Math.round(b / 100) * 100;
      const divisor = 1000;
      const estimate = (roundedA * roundedB) / divisor;
      return finish(
        item,
        round,
        `Estimate (${a} × ${b}) ÷ 1,000 by rounding each factor to the nearest hundred.`,
        estimate,
        [estimate / 10, estimate + 100, estimate * 10],
        `${a} ≈ ${roundedA} and ${b} ≈ ${roundedB}. Then (${roundedA} × ${roundedB}) ÷ 1,000 = ${estimate}.`,
      );
    },

    grouping(item, round) {
      const packs = seeded(item, round, 37, 5, 11);
      const perPack = seeded(item, round, 38, 8, 16);
      const total = packs * perPack;
      return finish(
        item,
        round,
        `A coach needs ${total} tennis balls. Each sealed pack holds ${perPack} balls. How many packs are needed?`,
        packs,
        [packs - 1, packs + 1, perPack],
        `Divide the total by the number in each pack: ${total} ÷ ${perPack} = ${packs} packs.`,
      );
    },

    linear_solve(item, round) {
      const x = seeded(item, round, 39, -6, 12);
      const coefficient = seeded(item, round, 40, 2, 7);
      const constant = seeded(item, round, 41, 3, 15);
      const result = coefficient * x + constant;
      return finish(
        item,
        round,
        `Solve ${coefficient}x + ${constant} = ${result}.`,
        x,
        [x - 2, x + 2, result - constant],
        `Subtract ${constant}: ${coefficient}x = ${result - constant}. Divide by ${coefficient}: x = ${x}.`,
      );
    },

    slope(item, round) {
      const slope = seeded(item, round, 42, -4, 4) || 2;
      const x1 = seeded(item, round, 43, -3, 2);
      const y1 = seeded(item, round, 44, -5, 5);
      const run = seeded(item, round, 45, 2, 4);
      const x2 = x1 + run;
      const y2 = y1 + slope * run;
      return finish(
        item,
        round,
        `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        slope,
        [-slope, run, slope + 1],
        `Slope = (${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${y2 - y1} ÷ ${run} = ${slope}.`,
      );
    },

    expression(item, round) {
      const days = seeded(item, round, 46, 2, 5);
      const gift = seeded(item, round, 47, 2, 8) * 5;
      const correct = `j − ${days}d + ${gift}`;
      return finish(
        item,
        round,
        `Jordan starts with j dollars, spends d dollars on each of ${days} days, then receives ${gift} dollars. Which expression gives the final amount?`,
        correct,
        [`j + ${days}d + ${gift}`, `j − ${days}(d + ${gift})`, `${days}j − d + ${gift}`],
        `Spending ${days}d lowers the amount, and the gift adds ${gift}: ${correct}.`,
      );
    },

    algebra_compare(item, round) {
      const a = seeded(item, round, 48, 3, 12);
      const b = seeded(item, round, 49, 2, 8);
      const negative = (item.id + round) % 2 === 0;
      const signedB = negative ? -b : b;
      const left = a - signedB;
      const right = a + signedB;
      const correct = left > right ? "Column A is greater" : left < right ? "Column B is greater" : "The quantities are equal";
      return finish(
        item,
        round,
        `Let a = ${a} and b = ${signedB}. Compare Column A: a − b with Column B: a + b.`,
        correct,
        ["Column A is greater", "Column B is greater", "The quantities are equal", "Cannot be determined"].filter((value) => value !== correct),
        `Column A is ${a} − (${signedB}) = ${left}; Column B is ${a} + (${signedB}) = ${right}. Therefore, ${correct.toLowerCase()}.`,
      );
    },

    sequence(item, round) {
      const start = seeded(item, round, 50, 2, 8);
      const step = seeded(item, round, 51, 2, 6);
      const position = seeded(item, round, 52, 6, 10);
      const answer = start + (position - 1) * step;
      const shown = [start, start + step, start + 2 * step, start + 3 * step];
      return finish(
        item,
        round,
        `The sequence begins ${shown.join(", ")}, … What is term ${position}?`,
        answer,
        [answer - step, answer + step, start + position * step],
        `The common difference is ${step}. Term ${position} is ${start} + (${position} − 1) × ${step} = ${answer}.`,
      );
    },

    area(item, round) {
      const base = seeded(item, round, 53, 5, 14);
      const height = seeded(item, round, 54, 4, 12);
      const area = (base * height) / 2;
      return finish(
        item,
        round,
        `A triangle has base ${base} cm and perpendicular height ${height} cm. What is its area?`,
        `${area} cm²`,
        [`${base * height} cm²`, `${base + height} cm²`, `${area + base} cm²`],
        `Triangle area = ½ × base × height = ½ × ${base} × ${height} = ${area} cm².`,
      );
    },

    volume(item, round) {
      const length = seeded(item, round, 55, 4, 10);
      const width = seeded(item, round, 56, 3, 7);
      const height = seeded(item, round, 57, 2, 6);
      const volume = length * width * height;
      return finish(
        item,
        round,
        `A rectangular prism is ${length} cm long, ${width} cm wide, and ${height} cm high. What is its volume?`,
        `${volume} cm³`,
        [`${2 * (length * width + length * height + width * height)} cm³`, `${length * width} cm³`, `${volume + height} cm³`],
        `Volume = length × width × height = ${length} × ${width} × ${height} = ${volume} cm³.`,
      );
    },

    angles(item, round) {
      const first = seeded(item, round, 58, 35, 70);
      const second = seeded(item, round, 59, 40, 75);
      const adjustedSecond = Math.min(second, 150 - first);
      const third = 180 - first - adjustedSecond;
      return finish(
        item,
        round,
        `Two angles of a triangle measure ${first}° and ${adjustedSecond}°. What is the third angle?`,
        `${third}°`,
        [`${180 - first}°`, `${first + adjustedSecond}°`, `${third + 10}°`],
        `Triangle angles total 180°. So 180 − ${first} − ${adjustedSecond} = ${third}°.`,
      );
    },

    coordinate(item, round) {
      const x = seeded(item, round, 60, -7, 7) || 3;
      const y = seeded(item, round, 61, -7, 7) || -4;
      const overX = (item.id + round) % 2 === 0;
      const correct = overX ? `(${x}, ${-y})` : `(${-x}, ${y})`;
      const axis = overX ? "x-axis" : "y-axis";
      return finish(
        item,
        round,
        `Point P is (${x}, ${y}). What are its coordinates after reflection across the ${axis}?`,
        correct,
        [`(${-x}, ${-y})`, overX ? `(${-x}, ${y})` : `(${x}, ${-y})`, `(${y}, ${x})`],
        `A reflection across the ${axis} changes only the ${overX ? "y" : "x"}-coordinate's sign, giving ${correct}.`,
      );
    },

    scale_distance(item, round) {
      const scale = seeded(item, round, 62, 2, 6);
      const mapDistance = seeded(item, round, 63, 3, 9);
      const actual = scale * mapDistance;
      return finish(
        item,
        round,
        `On a map, 1 cm represents ${scale} km. Two towns are ${mapDistance} cm apart on the map. What is the actual distance?`,
        `${actual} km`,
        [`${actual - scale} km`, `${mapDistance / scale} km`, `${actual + mapDistance} km`],
        `Multiply map distance by the scale: ${mapDistance} × ${scale} = ${actual} km.`,
      );
    },

    probability(item, round) {
      const red = seeded(item, round, 64, 2, 7);
      const blue = seeded(item, round, 65, 2, 7);
      const green = seeded(item, round, 66, 1, 5);
      const total = red + blue + green;
      const correct = fraction(red, total);
      return finish(
        item,
        round,
        `A bag has ${red} red, ${blue} blue, and ${green} green counters. What is the probability of choosing a red counter?`,
        correct,
        [fraction(blue, total), fraction(red, blue + green), fraction(total - red, total)],
        `There are ${total} counters and ${red} favorable outcomes, so the probability is ${red}/${total} = ${correct}.`,
      );
    },

    complement(item, round) {
      const numerator = seeded(item, round, 67, 1, 7);
      const denominator = seeded(item, round, 68, numerator + 2, numerator + 8);
      const correct = fraction(denominator - numerator, denominator);
      return finish(
        item,
        round,
        `If P(A) = ${numerator}/${denominator}, what is the probability that A does not happen?`,
        correct,
        [fraction(numerator, denominator), fraction(denominator, numerator), fraction(denominator - numerator, numerator)],
        `An event and its complement total 1: 1 − ${numerator}/${denominator} = ${correct}.`,
      );
    },

    counting(item, round) {
      const shirts = seeded(item, round, 69, 2, 6);
      const pants = seeded(item, round, 70, 2, 5);
      const shoes = seeded(item, round, 71, 2, 4);
      const total = shirts * pants * shoes;
      return finish(
        item,
        round,
        `Marco can choose from ${shirts} shirts, ${pants} pairs of pants, and ${shoes} pairs of shoes. How many different outfits are possible?`,
        total,
        [shirts + pants + shoes, shirts * pants, total - shoes],
        `Use the multiplication principle: ${shirts} × ${pants} × ${shoes} = ${total} outfits.`,
      );
    },

    sample_space(item, round) {
      const target = seeded(item, round, 72, 4, 10);
      let favorable = 0;
      for (let first = 1; first <= 6; first += 1) {
        for (let second = 1; second <= 6; second += 1) {
          if (first + second === target) favorable += 1;
        }
      }
      const correct = fraction(favorable, 36);
      return finish(
        item,
        round,
        `Two fair six-sided dice are rolled. What is the probability that their sum is ${target}?`,
        correct,
        [fraction(favorable + 1, 36), fraction(favorable, 12), fraction(12 - target, 36)],
        `There are 36 ordered outcomes and ${favorable} pairs with sum ${target}, so the probability is ${favorable}/36 = ${correct}.`,
      );
    },
  };

  function makeProblem(source, round) {
    const generator = generators[source.family] || generators.arithmetic;
    return generator(source, round);
  }

  function sessionState(number = state.selectedSession) {
    return state.sessions[String(number)];
  }

  function sessionSummary(session) {
    const item = sessionState(session.number);
    if (item.status === "not-started") return "Not started";
    if (item.status === "active") return `Round ${item.round} · ${Object.keys(item.answers).length}/${item.activeIds.length}`;
    if (item.status === "between") return `Round ${item.round} complete · retry ready`;
    return item.mastered ? "Mastered" : `Finished · ${item.finalMissed.length} to review`;
  }

  function renderPicker() {
    picker.innerHTML = SESSIONS.map((session) => {
      const progress = sessionState(session.number);
      const statusClass = progress.status === "completed" ? (progress.mastered ? "mastered" : "finished") : "";
      return `
        <button type="button" data-session="${session.number}" class="${state.selectedSession === session.number ? "selected" : ""} ${statusClass}">
          <span>Session ${session.number}</span>
          <strong>${esc(session.subjects.join(" + "))} · ${session.ids.length} questions</strong>
          <small>${esc(sessionSummary(session))}</small>
        </button>`;
    }).join("");
  }

  function renderWelcome(session) {
    const sessionMeta = SESSIONS[session - 1];
    app.innerHTML = `
      <section class="welcome-card">
        <div class="welcome-copy">
          <p class="eyebrow">Session ${session} · ${esc(sessionMeta.subjects.join(" + "))}</p>
          <h2>Practice the skill, not the screenshot.</h2>
          <p>These ${sessionMeta.ids.length} questions are clean, text-native practice versions of Marco's missed QR and MA skills. A wrong answer shows a short explanation immediately. Only missed skills move forward, with new numbers, for a maximum of three rounds.</p>
          <div class="skill-pills">${sessionMeta.categories.map((category) => `<span>${esc(category)}</span>`).join("")}</div>
          <button type="button" class="primary-action" data-action="start-session">Start Session ${session}</button>
        </div>
        <div class="welcome-art" aria-label="Three-round practice path">
          <div class="round-stack">
            <article><b>1</b><div><strong>First practice</strong><small>Up to 20 questions from Marco's verified miss list.</small></div></article>
            <article><b>2</b><div><strong>New-number retry</strong><small>Only skills missed in Round 1 return.</small></div></article>
            <article><b>3</b><div><strong>Final practice</strong><small>One last fresh version, then the session ends.</small></div></article>
          </div>
        </div>
      </section>`;
  }

  function renderQuestion() {
    const session = sessionState();
    const source = SOURCE_BY_ID.get(session.activeIds[session.position]);
    const problem = makeProblem(source, session.round);
    const picked = session.answers[String(source.id)] || null;
    const answeredCount = Object.keys(session.answers).length;
    const answerIsCorrect = picked?.choice === problem.answer;
    const optionHtml = problem.choices.map((choice, index) => {
      const letter = LETTERS[index];
      let className = "";
      if (picked) {
        if (letter === problem.answer) className = "correct-option";
        else if (letter === picked.choice) className = "wrong-option";
        else className = "locked-other";
      }
      return `<button type="button" data-choice="${letter}" class="${className}" ${picked ? "disabled" : ""}><span>${letter}</span><b>${esc(choice)}</b></button>`;
    }).join("");
    const grid = session.activeIds.map((id, index) => {
      const answer = session.answers[String(id)];
      const item = SOURCE_BY_ID.get(id);
      const itemProblem = makeProblem(item, session.round);
      const resultClass = answer ? (answer.choice === itemProblem.answer ? "correct" : "wrong") : "";
      return `<span class="${resultClass} ${index === session.position ? "current" : ""}">${index + 1}</span>`;
    }).join("");
    const feedback = picked
      ? answerIsCorrect
        ? `<div class="instant-feedback correct"><span class="feedback-mark">✓</span><div><strong>Correct!</strong><span>Nice work—this skill will not return in the next round.</span></div></div>`
        : `<div class="instant-feedback wrong"><span class="feedback-mark">×</span><div><strong>Not quite. The correct answer is ${problem.answer}: ${esc(problem.choices[LETTERS.indexOf(problem.answer)])}.</strong><span>${esc(problem.explanation)}</span></div></div>`
      : "";
    const isLast = session.position === session.activeIds.length - 1;
    app.innerHTML = `
      <section class="practice-card">
        <aside class="round-panel">
          <div class="round-heading"><span>Session ${state.selectedSession}</span><small>${esc(SOURCES[session.activeIds[0] - 1]?.subject || source.subject)} practice</small></div>
          <div class="round-subheading"><strong>Round ${session.round}</strong><span>${session.round === 1 ? "First practice" : "Missed skills only"}</span></div>
          <div class="stats"><div><strong>${answeredCount}</strong><span>answered</span></div><div><strong>${session.activeIds.length - answeredCount}</strong><span>remaining</span></div></div>
          <p class="grid-label">One-way progress</p>
          <div class="number-grid" aria-label="Question progress">${grid}</div>
          <p class="locked-note">Answers lock after one click. A wrong answer shows its explanation before you continue.</p>
        </aside>
        <div class="question-panel">
          <div class="question-topline">
            <strong><b>${session.position + 1}</b>/${session.activeIds.length}</strong>
            <div class="progress-track"><span style="width:${((session.position + 1) / session.activeIds.length) * 100}%"></span></div>
            <small>Practice skill #${source.id}</small>
          </div>
          <div class="chips"><span>${source.subject === "QR" ? "Quantitative Reasoning" : "Mathematics Achievement"}</span><span>${esc(source.category)}</span><span>Based on Mock ${source.mock}, Q${source.question}</span></div>
          <p class="prompt-label">Choose the best answer</p>
          <h2>${esc(problem.stem)}</h2>
          <div class="options">${optionHtml}</div>
          ${feedback}
          <div class="question-footer"><span>${picked ? "Answer saved." : "Choose one answer to continue."}</span><button type="button" data-action="next" ${picked ? "" : "disabled"}>${isLast ? `Finish Round ${session.round}` : "Next Question"}</button></div>
        </div>
      </section>`;
  }

  function categoryPills(ids) {
    const counts = new Map();
    ids.forEach((id) => {
      const category = CATEGORY_SHORT[SOURCE_BY_ID.get(id).category];
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => `<span>${esc(name)} · ${count}</span>`).join("");
  }

  function renderBetweenRounds() {
    const session = sessionState();
    const last = session.history.at(-1);
    app.innerHTML = `
      <section class="complete-card">
        <div>
          <div class="checkmark review">↻</div>
          <p class="eyebrow">Session ${state.selectedSession} · Round ${last.round} complete</p>
          <h2>${last.correct}/${last.total} correct</h2>
          <p>${last.wrongIds.length} missed ${last.wrongIds.length === 1 ? "skill is" : "skills are"} moving to Round ${last.round + 1}. The next version uses different numbers and reshuffled answers.</p>
          <div class="skill-pills">${categoryPills(last.wrongIds)}</div>
          <div class="complete-actions"><button type="button" class="primary-action" data-action="start-next-round">Start Round ${last.round + 1}</button><button type="button" class="secondary-action" data-view="progress">View Progress</button></div>
        </div>
      </section>`;
  }

  function renderComplete() {
    const session = sessionState();
    const last = session.history.at(-1);
    const nextSession = state.selectedSession < SESSIONS.length ? state.selectedSession + 1 : null;
    const title = session.mastered ? "Session mastered!" : "Round 3 complete";
    const body = session.mastered
      ? `Marco cleared every active skill. This session finished in ${session.history.length} ${session.history.length === 1 ? "round" : "rounds"}.`
      : `Practice stops after Round 3. ${session.finalMissed.length} ${session.finalMissed.length === 1 ? "skill remains" : "skills remain"} in the review list.`;
    app.innerHTML = `
      <section class="complete-card">
        <div>
          <div class="checkmark ${session.mastered ? "" : "review"}">${session.mastered ? "✓" : "3"}</div>
          <p class="eyebrow">Session ${state.selectedSession} · ${last.correct}/${last.total} correct in the final round</p>
          <h2>${title}</h2>
          <p>${body}</p>
          ${session.finalMissed.length ? `<div class="skill-pills">${categoryPills(session.finalMissed)}</div>` : ""}
          <div class="complete-actions">
            ${nextSession ? `<button type="button" class="primary-action" data-session="${nextSession}">Go to Session ${nextSession}</button>` : ""}
            <button type="button" class="secondary-action" data-view="progress">View Progress</button>
            <button type="button" class="secondary-action" data-action="restart-session">Practice This Session Again</button>
          </div>
        </div>
      </section>`;
  }

  function renderProgress() {
    const all = SESSIONS.map((session) => ({ meta: session, progress: sessionState(session.number) }));
    const completed = all.filter((item) => item.progress.status === "completed").length;
    const mastered = all.filter((item) => item.progress.mastered).length;
    const rounds = all.reduce((sum, item) => sum + item.progress.history.length, 0);
    const finalReview = all.reduce((sum, item) => sum + item.progress.finalMissed.length, 0);
    const rows = all.map(({ meta, progress }) => {
      const statusClass = progress.status === "completed" ? (progress.mastered ? "mastered" : "finished") : progress.status === "not-started" ? "not-started" : "";
      const roundCells = [1, 2, 3].map((round) => {
        const result = progress.history.find((entry) => entry.round === round);
        return `<div><strong>${result ? `${result.correct}/${result.total}` : "—"}</strong><small>Round ${round}</small></div>`;
      }).join("");
      return `<article class="result-row ${statusClass}"><div><h3>Session ${meta.number} · ${esc(meta.subjects.join(" + "))}</h3><p>${esc(meta.categories.join(" · "))}</p></div>${roundCells}<span class="status-badge">${esc(sessionSummary(meta))}</span></article>`;
    }).join("");
    app.innerHTML = `
      <section class="progress-card">
        <div class="progress-heading"><div><p class="eyebrow">Marco's practice record</p><h2>Progress</h2><p>Round scores and final review counts are stored on this device.</p></div><button type="button" class="secondary-action" data-action="reset-all">Reset All Progress</button></div>
        <div class="summary-strip"><article><strong>${completed}/${SESSIONS.length}</strong><span>sessions finished</span></article><article><strong>${mastered}</strong><span>sessions mastered</span></article><article><strong>${rounds}</strong><span>rounds completed</span></article><article><strong>${finalReview}</strong><span>skills left after Round 3</span></article></div>
        <div class="result-list">${rows}</div>
      </section>`;
  }

  function render() {
    navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
    renderPicker();
    if (state.view === "progress") {
      renderProgress();
      return;
    }
    const session = sessionState();
    if (session.status === "not-started") renderWelcome(state.selectedSession);
    else if (session.status === "active") renderQuestion();
    else if (session.status === "between") renderBetweenRounds();
    else renderComplete();
  }

  function startSession(restart = false) {
    const meta = SESSIONS[state.selectedSession - 1];
    if (!restart && sessionState().status !== "not-started") return;
    state.sessions[String(state.selectedSession)] = {
      ...freshSession(),
      status: "active",
      round: 1,
      activeIds: [...meta.ids],
      updatedAt: new Date().toISOString(),
    };
    state.view = "practice";
    setAnnouncement(`Session ${state.selectedSession}, Round 1 started.`);
    saveState();
    render();
  }

  function chooseAnswer(letter) {
    const session = sessionState();
    if (session.status !== "active") return;
    const id = session.activeIds[session.position];
    if (session.answers[String(id)]) return;
    const problem = makeProblem(SOURCE_BY_ID.get(id), session.round);
    session.answers[String(id)] = { choice: letter, correct: letter === problem.answer };
    session.updatedAt = new Date().toISOString();
    setAnnouncement(letter === problem.answer ? "Correct answer." : "Explanation shown below the answer choices.");
    saveState();
    render();
    document.querySelector(".instant-feedback")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function finishRound() {
    const session = sessionState();
    const wrongIds = session.activeIds.filter((id) => !session.answers[String(id)]?.correct);
    const result = {
      round: session.round,
      total: session.activeIds.length,
      correct: session.activeIds.length - wrongIds.length,
      wrongIds,
      finishedAt: new Date().toISOString(),
    };
    session.history.push(result);
    session.updatedAt = result.finishedAt;
    if (wrongIds.length > 0 && session.round < MAX_ROUNDS) {
      session.status = "between";
      session.pendingIds = wrongIds;
      setAnnouncement(`Round ${session.round} complete. ${wrongIds.length} missed skills will return with new numbers.`);
    } else {
      session.status = "completed";
      session.mastered = wrongIds.length === 0;
      session.finalMissed = wrongIds;
      session.pendingIds = [];
      setAnnouncement(session.mastered ? "Session mastered." : "Round 3 complete. The practice session has ended.");
    }
    saveState();
    render();
  }

  function nextQuestion() {
    const session = sessionState();
    const id = session.activeIds[session.position];
    if (!session.answers[String(id)]) return;
    if (session.position < session.activeIds.length - 1) {
      session.position += 1;
      session.updatedAt = new Date().toISOString();
      setAnnouncement("");
      saveState();
      render();
      return;
    }
    finishRound();
  }

  function startNextRound() {
    const session = sessionState();
    if (session.status !== "between" || session.round >= MAX_ROUNDS) return;
    session.round += 1;
    session.activeIds = [...session.pendingIds];
    session.pendingIds = [];
    session.position = 0;
    session.answers = {};
    session.status = "active";
    session.updatedAt = new Date().toISOString();
    setAnnouncement(`Round ${session.round} started with fresh numbers and answer choices.`);
    saveState();
    render();
  }

  function selectSession(number) {
    state.selectedSession = number;
    state.view = "practice";
    setAnnouncement("");
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.choice) chooseAnswer(target.dataset.choice);
    else if (target.dataset.session) selectSession(Number(target.dataset.session));
    else if (target.dataset.view) {
      state.view = target.dataset.view;
      setAnnouncement("");
      saveState();
      render();
    } else if (target.dataset.action === "start-session") startSession();
    else if (target.dataset.action === "restart-session") startSession(true);
    else if (target.dataset.action === "next") nextQuestion();
    else if (target.dataset.action === "start-next-round") startNextRound();
    else if (target.dataset.action === "reset-all") {
      if (window.confirm("Reset every session, score, and retry round on this device?")) {
        state = freshState();
        setAnnouncement("All saved progress was reset.");
        saveState();
        render();
      }
    }
  });

  window.__MARCO_MATH_TEST__ = {
    makeProblem,
    sources: SOURCES,
    sessions: SESSIONS,
    getState: () => state,
  };

  render();
})();
