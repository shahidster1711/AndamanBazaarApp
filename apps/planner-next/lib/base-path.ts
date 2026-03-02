const normalizeBasePath = (value: string | undefined): string => {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return "";
  }
  const normalized = raw.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
};

export const plannerBasePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export const withPlannerBasePath = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${plannerBasePath}${normalizedPath}`;
};
