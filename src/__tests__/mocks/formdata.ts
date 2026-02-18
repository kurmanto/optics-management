export function makeFormData(obj: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        fd.append(key, v);
      }
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}
