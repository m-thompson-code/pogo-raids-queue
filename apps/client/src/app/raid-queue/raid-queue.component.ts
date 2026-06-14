import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RaidQueueService, type QueueEntry } from './raid-queue.service';

const GROUP_SIZE = 10;

@Component({
  selector: 'app-raid-queue',
  imports: [AsyncPipe, DatePipe],
  templateUrl: './raid-queue.component.html',
  styleUrl: './raid-queue.component.scss',
})
export class RaidQueueComponent {
  private readonly raidQueueService = inject(RaidQueueService);
  protected readonly queue$ = this.raidQueueService.getQueue();

  protected readonly snackbar = signal<string | null>(null);
  protected readonly addInput = signal('');
  protected readonly lastClearedAt = signal<Date | null>(null);
  protected readonly notesVisible = signal(localStorage.getItem('raid-notes-visible') === 'true');
  protected readonly notesText = signal(localStorage.getItem('raid-notes-text') ?? '');
  protected readonly notesHeight = signal(localStorage.getItem('raid-notes-height') ?? '');
  private snackbarTimer: ReturnType<typeof setTimeout> | null = null;

  protected saveNotesText(value: string): void {
    this.notesText.set(value);
    localStorage.setItem('raid-notes-text', value);
  }

  protected saveNotesHeight(height: string): void {
    if (!height) return;
    this.notesHeight.set(height);
    localStorage.setItem('raid-notes-height', height);
  }

  protected toggleNotes(): void {
    const next = !this.notesVisible();
    this.notesVisible.set(next);
    localStorage.setItem('raid-notes-visible', String(next));
  }

  private showSnackbar(message: string): void {
    if (this.snackbarTimer) clearTimeout(this.snackbarTimer);
    this.snackbar.set(message);
    this.snackbarTimer = setTimeout(() => this.snackbar.set(null), 2500);
  }

  protected toGroups(queue: QueueEntry[]): QueueEntry[][] {
    const groups: QueueEntry[][] = [];
    for (let i = 0; i < queue.length; i += GROUP_SIZE) {
      groups.push(queue.slice(i, i + GROUP_SIZE));
    }
    return groups;
  }

  protected removeEntry(entry: QueueEntry): void {
    this.raidQueueService.removeEntry(entry.twitchUserId);
    this.showSnackbar(`${entry.pogoUsername} removed from queue`);
  }

  protected removeGroup(group: QueueEntry[], groupIndex: number): void {
    group.forEach((e) => this.raidQueueService.removeEntry(e.twitchUserId));
    this.showSnackbar(`Group ${groupIndex + 1} cleared`);
  }

  protected copyEntry(entry: QueueEntry): void {
    if (entry.status === 'invited') return;
    navigator.clipboard.writeText(entry.pogoUsername);
    this.raidQueueService.updateGroupStatus([entry.twitchUserId], 'copied');
    this.showSnackbar(`${entry.pogoUsername} copied to clipboard`);
  }

  protected copyGroup(group: QueueEntry[], groupIndex: number): void {
    const eligible = group.filter((e) => e.status !== 'invited');
    if (eligible.length === 0) return;
    navigator.clipboard.writeText(eligible.map((e) => e.pogoUsername).join(','));
    this.raidQueueService.updateGroupStatus(eligible.map((e) => e.twitchUserId), 'copied');
    this.showSnackbar(`Group ${groupIndex + 1} copied to clipboard`);
  }

  protected setGroupInvited(group: QueueEntry[], groupIndex: number): void {
    this.raidQueueService.updateGroupStatus(group.map((e) => e.twitchUserId), 'invited');
    this.showSnackbar(`Group ${groupIndex + 1} marked as invited`);
  }

  protected toggleEntryStatus(entry: QueueEntry, event: MouseEvent): void {
    event.preventDefault();
    if (event.button !== 2) return;
    const newStatus = entry.status === 'invited' ? 'joined' : 'invited';
    this.raidQueueService.updateGroupStatus([entry.twitchUserId], newStatus);
    this.showSnackbar(`${entry.pogoUsername} marked as ${newStatus}`);
  }

  protected copyAll(queue: QueueEntry[]): void {
    const eligible = queue.filter((e) => e.status !== 'invited');
    if (eligible.length === 0) return;
    navigator.clipboard.writeText(eligible.map((e) => e.pogoUsername).join(','));
    this.raidQueueService.updateGroupStatus(eligible.map((e) => e.twitchUserId), 'copied');
    this.showSnackbar('All users copied to clipboard');
  }

  protected clearAll(queue: QueueEntry[]): void {
    queue.forEach((e) => this.raidQueueService.removeEntry(e.twitchUserId));
    this.lastClearedAt.set(new Date());
    this.showSnackbar('Queue cleared');
  }

  protected async addUser(): Promise<void> {
    const raw = this.addInput().trim();
    if (!raw) return;
    const usernames = raw.split(',').map((u) => u.trim()).filter(Boolean);
    await Promise.all(usernames.map((u) => this.raidQueueService.addManual(u)));
    this.addInput.set('');
    const listed = usernames.join(', ');
    this.showSnackbar(`${listed} added to queue`);
  }
}
