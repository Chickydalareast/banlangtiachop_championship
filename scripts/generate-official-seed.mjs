import {
  createHash,
} from "node:crypto";
import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoPath = resolve(dirname(scriptPath), "..");
const dataPath = resolve(
  repoPath,
  "data/official-tournament.json",
);
const seedPath = resolve(repoPath, "supabase/seed.sql");
const checkOnly = process.argv.includes("--check");

function fail(message) {
  throw new Error(message);
}

function unique(values, label) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      fail(`Duplicate ${label}: ${value}`);
    }

    seen.add(value);
  }
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function matchId(index) {
  return `20000000-0000-4000-8000-${String(
    index + 1,
  ).padStart(12, "0")}`;
}

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const teams = data.teams;
const rounds = data.rounds;

if (data.schemaVersion !== 1) {
  fail("Unsupported official tournament schemaVersion.");
}

if (!Array.isArray(teams) || teams.length !== 9) {
  fail("Official tournament must contain exactly 9 teams.");
}

if (!Array.isArray(rounds) || rounds.length !== 9) {
  fail("Official tournament must contain exactly 9 rounds.");
}

unique(teams.map((team) => team.key), "team key");
unique(teams.map((team) => team.id), "team id");
unique(
  teams.map((team) => team.name.toLocaleLowerCase("vi")),
  "team name",
);
unique(
  teams.map((team) =>
    team.shortName.toLocaleLowerCase("vi"),
  ),
  "team short name",
);
unique(teams.map((team) => team.logoPath), "logo path");
unique(
  teams.map((team) => team.displayOrder),
  "display order",
);

const teamByKey = new Map(
  teams.map((team) => [team.key, team]),
);
const officialLogoHashes = new Map();
const placeholderPath = resolve(
  repoPath,
  "public/images/tournament-logo.png",
);
const placeholderHash = existsSync(placeholderPath)
  ? createHash("sha256")
      .update(readFileSync(placeholderPath))
      .digest("hex")
  : null;

for (const team of teams) {
  if (
    !team.key ||
    !team.id ||
    !team.name?.trim() ||
    !team.shortName?.trim()
  ) {
    fail(`Incomplete team record: ${JSON.stringify(team)}`);
  }

  if (
    !Number.isInteger(team.displayOrder) ||
    team.displayOrder < 1 ||
    team.displayOrder > 9
  ) {
    fail(`Invalid displayOrder for ${team.key}.`);
  }

  const logoFile = resolve(
    repoPath,
    `public${team.logoPath}`,
  );

  if (!existsSync(logoFile)) {
    fail(`Missing official logo: ${team.logoPath}`);
  }

  if (statSync(logoFile).size === 0) {
    fail(`Empty official logo: ${team.logoPath}`);
  }

  const logoHash = createHash("sha256")
    .update(readFileSync(logoFile))
    .digest("hex");

  if (placeholderHash && logoHash === placeholderHash) {
    fail(
      `Logo is still the tournament placeholder: ${team.logoPath}`,
    );
  }

  if (officialLogoHashes.has(logoHash)) {
    fail(
      `Duplicate official logo content: ${team.logoPath} and ${officialLogoHashes.get(
        logoHash,
      )}`,
    );
  }

  officialLogoHashes.set(logoHash, team.logoPath);
}

const pairKeys = new Set();
const byeKeys = new Set();
const playedByTeam = new Map(
  teams.map((team) => [team.key, 0]),
);
const sideAByTeam = new Map(
  teams.map((team) => [team.key, 0]),
);
const sideBByTeam = new Map(
  teams.map((team) => [team.key, 0]),
);
const flattenedMatches = [];

for (const [roundIndex, round] of rounds.entries()) {
  const expectedDay = roundIndex + 1;

  if (round.day !== expectedDay) {
    fail(
      `Round index ${expectedDay} has day ${round.day}.`,
    );
  }

  if (!teamByKey.has(round.bye)) {
    fail(`Unknown bye team on day ${round.day}.`);
  }

  if (byeKeys.has(round.bye)) {
    fail(`Team ${round.bye} has more than one bye.`);
  }

  byeKeys.add(round.bye);

  if (
    !Array.isArray(round.matches) ||
    round.matches.length !== 4
  ) {
    fail(`Day ${round.day} must contain exactly 4 matches.`);
  }

  const usedToday = new Set();

  for (const [matchIndex, pairing] of round.matches.entries()) {
    if (
      !Array.isArray(pairing) ||
      pairing.length !== 2
    ) {
      fail(`Invalid pairing on day ${round.day}.`);
    }

    const [teamAKey, teamBKey] = pairing;

    if (
      !teamByKey.has(teamAKey) ||
      !teamByKey.has(teamBKey)
    ) {
      fail(
        `Unknown team on day ${round.day}: ${teamAKey} vs ${teamBKey}`,
      );
    }

    if (teamAKey === teamBKey) {
      fail(`Self match on day ${round.day}.`);
    }

    if (
      usedToday.has(teamAKey) ||
      usedToday.has(teamBKey)
    ) {
      fail(
        `A team appears twice on day ${round.day}.`,
      );
    }

    usedToday.add(teamAKey);
    usedToday.add(teamBKey);

    const pairKey = [teamAKey, teamBKey]
      .sort()
      .join("::");

    if (pairKeys.has(pairKey)) {
      fail(`Duplicate pairing: ${pairKey}`);
    }

    pairKeys.add(pairKey);
    playedByTeam.set(
      teamAKey,
      playedByTeam.get(teamAKey) + 1,
    );
    playedByTeam.set(
      teamBKey,
      playedByTeam.get(teamBKey) + 1,
    );
    sideAByTeam.set(
      teamAKey,
      sideAByTeam.get(teamAKey) + 1,
    );
    sideBByTeam.set(
      teamBKey,
      sideBByTeam.get(teamBKey) + 1,
    );

    flattenedMatches.push({
      id: matchId(flattenedMatches.length),
      day: round.day,
      order: matchIndex + 1,
      teamAKey,
      teamBKey,
    });
  }

  if (usedToday.has(round.bye)) {
    fail(
      `Bye team ${round.bye} also plays on day ${round.day}.`,
    );
  }

  if (usedToday.size !== 8) {
    fail(`Day ${round.day} must use exactly 8 teams.`);
  }
}

if (flattenedMatches.length !== 36) {
  fail("Schedule must contain exactly 36 matches.");
}

if (pairKeys.size !== 36) {
  fail("Schedule must contain 36 unique unordered pairs.");
}

if (byeKeys.size !== 9) {
  fail("Every team must receive exactly one bye.");
}

for (const team of teams) {
  if (playedByTeam.get(team.key) !== 8) {
    fail(`${team.key} must play exactly 8 matches.`);
  }

  if (
    sideAByTeam.get(team.key) !== 4 ||
    sideBByTeam.get(team.key) !== 4
  ) {
    fail(
      `${team.key} must appear 4 times on each side.`,
    );
  }
}

const teamValueLines = teams.map((team) =>
  [
    "    (",
    `        ${sqlString(team.id)},`,
    `        ${sqlString(team.name)},`,
    `        ${sqlString(team.shortName)},`,
    `        ${sqlString(team.logoPath)},`,
    "        true,",
    `        ${team.displayOrder}`,
    "    )",
  ].join("\n"),
);

const teamIdByKey = new Map(
  teams.map((team) => [team.key, team.id]),
);

const matchValueLines = flattenedMatches.map((match) =>
  [
    "    (",
    `        ${sqlString(match.id)},`,
    `        ${sqlString(teamIdByKey.get(match.teamAKey))},`,
    `        ${sqlString(teamIdByKey.get(match.teamBKey))},`,
    "        null,",
    "        null,",
    "        'scheduled',",
    `        ${match.day},`,
    `        ${match.order},`,
    "        null",
    "    )",
  ].join("\n"),
);

const byeComments = rounds
  .map(
    (round) =>
      `-- Day ${round.day}: bye ${round.bye}`,
  )
  .join("\n");

const seedSql = `begin;

insert into public.tournament_settings (
    id,
    tournament_name,
    season_label,
    qualification_count
)
values (
    1,
    ${sqlString(data.tournament.name)},
    ${sqlString(data.tournament.seasonLabel)},
    ${data.tournament.qualificationCount}
)
on conflict (id) do update
set
    tournament_name = excluded.tournament_name,
    season_label = excluded.season_label,
    qualification_count = excluded.qualification_count,
    updated_at = now();

insert into public.teams (
    id,
    name,
    short_name,
    logo_path,
    is_active,
    display_order
)
values
${teamValueLines.join(",\n")}
on conflict (id) do update
set
    name = excluded.name,
    short_name = excluded.short_name,
    logo_path = excluded.logo_path,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_at = now();

${byeComments}

insert into public.matches as existing (
    id,
    team_a_id,
    team_b_id,
    score_a,
    score_b,
    status,
    match_day,
    match_order,
    scheduled_at
)
values
${matchValueLines.join(",\n")}
on conflict (id) do update
set
    team_a_id = excluded.team_a_id,
    team_b_id = excluded.team_b_id,
    match_day = excluded.match_day,
    match_order = excluded.match_order,
    scheduled_at = excluded.scheduled_at,
    updated_at = now()
where
    existing.status = 'scheduled'
    and existing.score_a is null
    and existing.score_b is null;

commit;
`;

if (checkOnly) {
  if (!existsSync(seedPath)) {
    fail("supabase/seed.sql does not exist.");
  }

  const currentSeed = readFileSync(
    seedPath,
    "utf8",
  ).replaceAll("\r\n", "\n");

  if (currentSeed !== seedSql) {
    fail(
      "supabase/seed.sql is not synchronized with official-tournament.json.",
    );
  }

  console.log(
    "PASS: official tournament data and seed.sql are synchronized.",
  );
} else {
  writeFileSync(seedPath, seedSql, "utf8");

  console.log(
    "Generated supabase/seed.sql from official tournament data.",
  );
}

console.log(
  `Verified ${teams.length} teams, ${rounds.length} days, ${flattenedMatches.length} unique matches.`,
);
console.log(
  "Verified one bye per team and 4 appearances on each match side.",
);
console.log(
  "Verified all 9 official logo files are real, non-empty and unique.",
);
