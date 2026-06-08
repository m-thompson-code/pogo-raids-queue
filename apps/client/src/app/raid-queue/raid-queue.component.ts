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
    navigator.clipboard.writeText(entry.pogoUsername);
    this.showSnackbar(`${entry.pogoUsername} copied to clipboard`);
  }

  protected copyGroup(group: QueueEntry[], groupIndex: number): void {
    navigator.clipboard.writeText(group.map((e) => e.pogoUsername).join(','));
    this.showSnackbar(`Group ${groupIndex + 1} copied to clipboard`);
  }

  protected copyAll(queue: QueueEntry[]): void {
    navigator.clipboard.writeText(queue.map((e) => e.pogoUsername).join(','));
    this.showSnackbar('All users copied to clipboard');
  }

  protected clearAll(queue: QueueEntry[]): void {
    queue.forEach((e) => this.raidQueueService.removeEntry(e.twitchUserId));
    this.showSnackbar('Queue cleared');
  }
}
