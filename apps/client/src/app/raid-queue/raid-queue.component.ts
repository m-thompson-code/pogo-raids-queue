import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RaidQueueService, type QueueEntry } from './raid-queue.service';

const GROUP_SIZE = 5;

@Component({
  selector: 'app-raid-queue',
  imports: [AsyncPipe],
  templateUrl: './raid-queue.component.html',
  styleUrl: './raid-queue.component.scss',
})
export class RaidQueueComponent {
  private readonly raidQueueService = inject(RaidQueueService);
  protected readonly queue$ = this.raidQueueService.getQueue();

  protected readonly snackbar = signal<string | null>(null);
  private snackbarTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.showSnackbar(`${entry.pogoUsername} copied to clipboard`);
  }

  protected copyGroup(group: QueueEntry[], groupIndex: number): void {
    const names = group.filter((e) => e.status !== 'invited').map((e) => e.pogoUsername);
    if (names.length === 0) return;
    navigator.clipboard.writeText(names.join(','));
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
    const names = queue.filter((e) => e.status !== 'invited').map((e) => e.pogoUsername);
    if (names.length === 0) return;
    navigator.clipboard.writeText(names.join(','));
    this.showSnackbar('All users copied to clipboard');
  }

  protected clearAll(queue: QueueEntry[]): void {
    queue.forEach((e) => this.raidQueueService.removeEntry(e.twitchUserId));
    this.showSnackbar('Queue cleared');
  }
}
