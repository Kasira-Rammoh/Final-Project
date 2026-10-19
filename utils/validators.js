
function isMoney(value, allowZero = false) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    (allowZero ? value >= 0 : value > 0)
  );
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

module.exports = { isMoney, normalizeName };
