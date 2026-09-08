/** Serialize read/modify/write operations, including after a failed write. */
export class SerializedStore {
  private pending: Promise<void> = Promise.resolve();
  constructor(private readonly read: () => Promise<Record<string, unknown> | null>, private readonly write: (value: Record<string, unknown>) => Promise<void>) {}
  update(change: (data: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    const task = this.pending.then(async () => {
      const data = await this.read() ?? {};
      await change(data);
      await this.write(data);
    });
    this.pending = task.catch(() => {});
    return task;
  }
}
