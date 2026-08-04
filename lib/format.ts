export function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function userLabel(user: { name?: string; email?: string } | string | undefined) {
  if (!user) return "—";
  if (typeof user === "string") return user;
  return user.name || user.email || "—";
}

export function initials(name?: string) {
  if (!name) return "AD";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
