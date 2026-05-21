"use client";

import { useEffect, useState } from "react";
import {
  freshSharedMemory,
  loadSharedMemory,
  subscribeSharedMemory,
  type SharedMemoryState,
} from "@/lib/shared-memory";

export function useSharedMemory() {
  const [memory, setMemory] = useState<SharedMemoryState>(freshSharedMemory);

  useEffect(() => {
    const refresh = () => setMemory(loadSharedMemory());
    refresh();
    return subscribeSharedMemory(refresh);
  }, []);

  return memory;
}
