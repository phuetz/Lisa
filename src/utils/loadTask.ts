// Generic loader for MediaPipe .task models
// Decides GPU vs CPU delegate based on availability
export async function loadTask<T extends { createFromOptions: any }>(TaskCtor: T, gpuPreferred = true) {
  // If WebGPU supported and preferred, use it
  const delegate = gpuPreferred && (navigator as any).gpu ? 'GPU' : 'CPU';
  return await TaskCtor.createFromOptions({ baseOptions: { delegate } });
}
