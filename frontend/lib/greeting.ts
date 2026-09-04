export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function displayFirstName(user: {
  first_name?: string | null;
  username?: string | null;
}): string {
  const first = (user.first_name || "").trim();
  if (first) {
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  const username = (user.username || "").trim();
  if (username) {
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return "there";
}

export function formatListedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
