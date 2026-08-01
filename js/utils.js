export function shuffle(arr) {
  let currentIndex = arr.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
  }
  return arr;
}

export function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Accepts a 'YYYY-MM-DD' / ISO string or a Date object.
function dateParts(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value)) return null;
    return [
      String(value.getFullYear()),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0')
    ];
  }
  const parts = String(value).split('T')[0].split('-');
  return parts.length === 3 ? parts : null;
}

export function formatDate(value) {
  const parts = dateParts(value);
  if (!parts) return value ? String(value) : '';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDateShort(value) {
  const parts = dateParts(value);
  if (!parts) return value ? String(value) : '';
  return `${parts[2]}/${parts[1]}`;
}

export function daysBetween(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function debounce(fn, ms) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function getHint(word) {
  if (!word) return '';
  if (word.length <= 1) return word;
  return word.charAt(0) + ' _'.repeat(word.length - 1) + ` (${word.length})`;
}

export function compareAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}
