import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../services/mock/storage";

export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback));
  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = readStorage(key, fallback);
      setValue((old) =>
        JSON.stringify(old) === JSON.stringify(next) ? old : next,
      );
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  return [value, setValue] as const;
}
